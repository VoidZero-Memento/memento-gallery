import { onUnmounted, ref, watch } from 'vue'

import type { Ref } from 'vue'

type TiltOptions = {
  maxTilt?: number
  active?: Ref<boolean>
  target?: Ref<HTMLElement | null>
}

type TiltState = {
  rx: number
  ry: number
  sx: number
  sy: number
  glow: number
}

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'
const EASE = 0.12
const REST: TiltState = { rx: 0, ry: 0, sx: 50, sy: 38, glow: 0 }

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** 每帧直写 CSS 变量，避免 Vue 逐帧重渲染 */
export const usePointerTilt = (options: TiltOptions = {}) => {
  const maxTilt = options.maxTilt ?? 7
  const tiltRef = options.target ?? ref<HTMLElement | null>(null)
  const cur: TiltState = { ...REST }
  const dst: TiltState = { ...REST }

  let raf = 0
  let frames = 0
  let rect: DOMRect | null = null
  let pointer: { x: number; y: number } | null = null
  let attached = false
  const media = typeof window === 'undefined' ? null : window.matchMedia(REDUCED_QUERY)
  let reduced = media?.matches ?? false

  const apply = () => {
    const node = tiltRef.value
    if (!node) return
    node.style.setProperty('--tilt-x', `${cur.rx.toFixed(3)}deg`)
    node.style.setProperty('--tilt-y', `${cur.ry.toFixed(3)}deg`)
    node.style.setProperty('--spot-x', `${cur.sx.toFixed(2)}%`)
    node.style.setProperty('--spot-y', `${cur.sy.toFixed(2)}%`)
    node.style.setProperty('--spot-glow', cur.glow.toFixed(3))
  }

  const resolveTarget = () => {
    if (!pointer || !rect || !rect.width || !rect.height) {
      Object.assign(dst, REST)
      return
    }
    const nx = (pointer.x - rect.left) / rect.width
    const ny = (pointer.y - rect.top) / rect.height
    const outside = Math.max(0, Math.abs(nx - 0.5) - 0.5, Math.abs(ny - 0.5) - 0.5)
    const falloff = clamp(1 - outside * 1.5, 0, 1)
    dst.ry = (nx - 0.5) * 2 * maxTilt * falloff
    dst.rx = (0.5 - ny) * 2 * maxTilt * falloff
    dst.sx = clamp(nx * 100, -30, 130)
    dst.sy = clamp(ny * 100, -30, 130)
    dst.glow = falloff
  }

  const step = () => {
    frames += 1
    if (frames % 16 === 1) rect = tiltRef.value?.getBoundingClientRect() ?? null
    resolveTarget()
    cur.rx = lerp(cur.rx, dst.rx, EASE)
    cur.ry = lerp(cur.ry, dst.ry, EASE)
    cur.sx = lerp(cur.sx, dst.sx, EASE)
    cur.sy = lerp(cur.sy, dst.sy, EASE)
    cur.glow = lerp(cur.glow, dst.glow, EASE)
    apply()
    const settled =
      Math.abs(cur.rx - dst.rx) < 0.02 &&
      Math.abs(cur.ry - dst.ry) < 0.02 &&
      Math.abs(cur.sx - dst.sx) < 0.08 &&
      Math.abs(cur.glow - dst.glow) < 0.005
    raf = settled ? 0 : requestAnimationFrame(step)
  }

  const kick = () => {
    if (!raf) raf = requestAnimationFrame(step)
  }

  const onMove = (e: PointerEvent) => {
    pointer = { x: e.clientX, y: e.clientY }
    kick()
  }
  const onUp = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return
    pointer = null
    kick()
  }
  const onLeave = () => {
    pointer = null
    kick()
  }
  const onResize = () => {
    rect = tiltRef.value?.getBoundingClientRect() ?? null
    kick()
  }

  const attach = () => {
    if (attached || reduced) return
    attached = true
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    window.addEventListener('pointercancel', onUp, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    rect = tiltRef.value?.getBoundingClientRect() ?? null
    kick()
  }

  const detach = () => {
    if (!attached) return
    attached = false
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
    window.removeEventListener('resize', onResize)
    document.documentElement.removeEventListener('pointerleave', onLeave)
    pointer = null
    kick()
  }

  const onMedia = (e: MediaQueryListEvent) => {
    reduced = e.matches
    if (reduced) {
      detach()
      Object.assign(cur, REST)
      Object.assign(dst, REST)
      apply()
    } else if (options.active?.value !== false) {
      attach()
    }
  }
  media?.addEventListener('change', onMedia)

  if (options.active) {
    watch(options.active, (on) => (on ? attach() : detach()), { immediate: true })
  } else {
    attach()
  }

  onUnmounted(() => {
    detach()
    media?.removeEventListener('change', onMedia)
    if (raf) cancelAnimationFrame(raf)
  })

  return { tiltRef }
}
