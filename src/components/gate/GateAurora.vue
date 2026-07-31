<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

import { PHASE_TUNING, clearAurora, createAuroraState, drawAurora, drawStaticAurora, resizeAurora, spawnRipple, startUnlock, updateAurora } from './aurora.engine'

import type { GateAuroraHandle, GatePhase } from '../../types/gate.types'

const props = defineProps<{ phase: GatePhase }>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const state = createAuroraState()

let ctx: CanvasRenderingContext2D | null = null
let rafId = 0
let lastTime = 0
let reduced = false
let observer: ResizeObserver | null = null
let motionQuery: MediaQueryList | null = null

const frame = (now: number) => {
  // 后台标签页恢复后 delta 会非常大，钳制上限避免粒子瞬移
  const delta = Math.min(now - lastTime, 50)
  lastTime = now
  if (!ctx) {
    rafId = 0
    return
  }
  updateAurora(state, delta)
  drawAurora(ctx, state)
  if (state.targetIntensity === 0 && state.intensity < 0.005) {
    clearAurora(ctx, state)
    rafId = 0
    return
  }
  rafId = requestAnimationFrame(frame)
}

const stop = () => {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
}

const start = () => {
  if (rafId || reduced || !ctx || document.hidden) return
  if (state.targetIntensity === 0 && state.intensity < 0.005) return
  lastTime = performance.now()
  rafId = requestAnimationFrame(frame)
}

const resize = () => {
  const canvas = canvasRef.value
  if (!canvas || !ctx) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const width = window.innerWidth
  const height = window.innerHeight
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  resizeAurora(state, width, height, dpr)
  if (reduced) drawStaticAurora(ctx, state)
}

const onPointerMove = (event: PointerEvent) => {
  state.pointerTargetX = event.clientX
  state.pointerTargetY = event.clientY
  state.pointerActive = true
}

const onPointerLeave = () => {
  state.pointerActive = false
}

const onVisibilityChange = () => {
  if (document.hidden) stop()
  else start()
}

const applyMotionPreference = () => {
  if (!ctx) return
  if (reduced) {
    stop()
    drawStaticAurora(ctx, state)
    return
  }
  clearAurora(ctx, state)
  start()
}

const onMotionChange = (event: MediaQueryListEvent) => {
  reduced = event.matches
  applyMotionPreference()
}

const burst = (clientX: number, clientY: number) => {
  if (reduced) return
  spawnRipple(state, clientX, clientY, 1)
  start()
}

watch(
  () => props.phase,
  (phase) => {
    const tuning = PHASE_TUNING[phase]
    state.targetIntensity = tuning.intensity
    state.targetBloom = tuning.bloom
    if (phase === 'intro' && state.width > 0) spawnRipple(state, state.width / 2, state.height / 2, 0.55)
    if (phase === 'unlocking') startUnlock(state)
    if (phase !== 'done') start()
  },
  { immediate: true },
)

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  ctx = canvas.getContext('2d')
  if (!ctx) return
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  reduced = motionQuery.matches
  motionQuery.addEventListener('change', onMotionChange)
  resize()
  observer = new ResizeObserver(resize)
  observer.observe(document.documentElement)
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  document.addEventListener('pointerleave', onPointerLeave, { passive: true })
  document.addEventListener('visibilitychange', onVisibilityChange)
  applyMotionPreference()
})

onUnmounted(() => {
  stop()
  observer?.disconnect()
  observer = null
  motionQuery?.removeEventListener('change', onMotionChange)
  motionQuery = null
  window.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('pointerleave', onPointerLeave)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  ctx = null
})

defineExpose<GateAuroraHandle>({ burst })
</script>

<template>
  <canvas ref="canvasRef" class="gate-aurora" aria-hidden="true" />
</template>

<style scoped>
.gate-aurora {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}
</style>
