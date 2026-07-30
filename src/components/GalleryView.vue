<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import { resolveGalleryImages } from '../utils/images'
import { CHROME_THEME, setChromeTheme } from '../utils/theme'

import { Waterfall } from 'vue-waterfall-plugin-next'
import GalleryLoading from './GalleryLoading.vue'
import GalleryTile from './GalleryTile.vue'
import 'vue-waterfall-plugin-next/dist/style.css'

import type { GalleryImage, GatePayload } from '../types/gallery.types'

/** 进度补到 100% 的停留时间（与 fill 过渡对齐） */
const FINISH_HOLD_MS = 1000
/** 加载页淡出时长 */
const LEAVE_MS = 780
/** afterRender 未触发时的兜底 */
const REVEAL_FALLBACK_MS = 3200

const props = defineProps<{
  payload: GatePayload
}>()

const emit = defineEmits<{
  exit: []
}>()

const images = ref<GalleryImage[]>([])
const prepared = ref(false)
const revealed = ref(false)
const arranging = ref(false)
const progressDone = ref(0)
const progressTotal = ref(0)
const visibleCount = ref(24)
const lightbox = ref<GalleryImage | null>(null)
const entered = ref(false)
const exitConfirm = ref(false)

let abortCtrl: AbortController | null = null
let revealTimer = 0
let leaveTimer = 0
let appendLock = false
let revealStarted = false

const showLoading = computed(() => !revealed.value)
const visibleImages = computed(() => images.value.slice(0, visibleCount.value))

const breakpoints = {
  1100: { rowPerView: 3 },
  720: { rowPerView: 2 },
  480: { rowPerView: 2 },
}

const clearRevealTimers = () => {
  window.clearTimeout(revealTimer)
  window.clearTimeout(leaveTimer)
}

const openLightbox = (img: GalleryImage) => {
  lightbox.value = img
}

const closeLightbox = () => {
  lightbox.value = null
}

const askExit = () => {
  exitConfirm.value = true
}

const cancelExit = () => {
  exitConfirm.value = false
}

const confirmExit = () => {
  exitConfirm.value = false
  emit('exit')
}

const onKey = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return
  if (exitConfirm.value) {
    cancelExit()
    return
  }
  closeLightbox()
}

/** 先补满进度并短暂停留，再淡出加载页，避免瞬间消失 */
const revealGallery = () => {
  if (revealed.value || !prepared.value || revealStarted) return
  revealStarted = true
  arranging.value = true
  clearRevealTimers()

  revealTimer = window.setTimeout(() => {
    revealed.value = true
    setChromeTheme(CHROME_THEME.soft)
    leaveTimer = window.setTimeout(() => {
      entered.value = true
    }, Math.round(LEAVE_MS * 0.45))
  }, FINISH_HOLD_MS)
}

const onWallAfterRender = () => {
  if (!prepared.value || revealed.value || revealStarted) return
  window.requestAnimationFrame(() => {
    revealGallery()
  })
}

const appendMore = () => {
  if (appendLock || !revealed.value) return
  if (visibleCount.value >= images.value.length) return
  appendLock = true
  visibleCount.value = Math.min(images.value.length, visibleCount.value + 18)
  window.setTimeout(() => {
    appendLock = false
  }, 220)
}

const onScroll = () => {
  const remain = document.documentElement.scrollHeight - window.scrollY - window.innerHeight
  if (remain < 900) appendMore()
}

const prepare = async () => {
  abortCtrl?.abort()
  clearRevealTimers()
  abortCtrl = new AbortController()
  const { signal } = abortCtrl

  prepared.value = false
  revealed.value = false
  arranging.value = false
  entered.value = false
  revealStarted = false
  images.value = []
  visibleCount.value = 24
  lightbox.value = null
  exitConfirm.value = false
  progressDone.value = 0
  progressTotal.value = 0
  appendLock = false
  setChromeTheme(CHROME_THEME.soft)

  const list = await resolveGalleryImages(
    props.payload,
    ({ done, total }) => {
      if (signal.aborted) return
      progressDone.value = done
      progressTotal.value = total
    },
    signal,
  )

  if (signal.aborted) return

  images.value = list
  prepared.value = true

  clearRevealTimers()
  revealTimer = window.setTimeout(() => {
    if (!signal.aborted) revealGallery()
  }, REVEAL_FALLBACK_MS)
}

watch(
  () => props.payload,
  () => {
    void prepare()
  },
)

onMounted(() => {
  void prepare()
  window.addEventListener('keydown', onKey)
  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
  abortCtrl?.abort()
  clearRevealTimers()
  setChromeTheme(CHROME_THEME.soft)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="loading-fade">
      <GalleryLoading
        v-if="showLoading"
        :done="progressDone"
        :total="progressTotal"
        :arranging="arranging"
      />
    </Transition>
  </Teleport>

  <section
    v-if="prepared"
    class="gallery"
    :class="{ 'gallery--in': entered, 'gallery--pending': !revealed }"
    :aria-hidden="!revealed"
  >
    <header class="gallery__header">
      <div class="gallery__brand">
        <p class="gallery__eyebrow">Memento Gallery</p>
        <h1 class="gallery__title">
          <span class="gallery__title-glow">软糖星河</span>
        </h1>
        <p class="gallery__meta">
          <span class="gallery__dot" />
          {{ visibleImages.length }} / {{ images.length }} 帧记忆漂浮中
        </p>
      </div>
      <button class="gallery__exit" type="button" @click="askExit">离开</button>
    </header>

    <Waterfall
      class="gallery__wall"
      :list="visibleImages"
      row-key="id"
      img-selector="url"
      :width="248"
      :gutter="20"
      :has-around-gutter="false"
      :breakpoints="breakpoints"
      background-color="transparent"
      :horizontal-order="true"
      :cross-origin="false"
      :lazyload="false"
      :animation-cancel="true"
      :pos-duration="0"
      :delay="80"
      align="center"
      @after-render="onWallAfterRender"
    >
      <template #default="{ item, url, index }">
        <GalleryTile :item="item" :url="url" :index="index" @open="openLightbox" />
      </template>
    </Waterfall>

    <Teleport to="body">
      <Transition name="lb">
        <div v-if="lightbox" class="lightbox" role="dialog" aria-modal="true" @click.self="closeLightbox">
          <div class="lightbox__aura" aria-hidden="true" />
          <figure class="lightbox__figure">
            <img class="lightbox__img" :src="lightbox.url" :alt="lightbox.name" />
            <figcaption class="lightbox__cap">{{ lightbox.name }}</figcaption>
          </figure>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="confirm">
        <div
          v-if="exitConfirm"
          class="exit-confirm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-confirm-title"
          @click.self="cancelExit"
        >
          <div class="exit-confirm__card">
            <p id="exit-confirm-title" class="exit-confirm__title">确定离开吗？</p>
            <p class="exit-confirm__desc">离开后需重新进入记忆之门</p>
            <div class="exit-confirm__actions">
              <button class="exit-confirm__btn exit-confirm__btn--ghost" type="button" @click="cancelExit">
                再看看
              </button>
              <button class="exit-confirm__btn exit-confirm__btn--danger" type="button" @click="confirmExit">
                离开
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped>
.gallery {
  position: relative;
  z-index: 1;
  min-height: 100svh;
  padding:
    max(28px, env(safe-area-inset-top, 0px))
    28px
    max(72px, calc(48px + env(safe-area-inset-bottom, 0px)));
  max-width: 1280px;
  margin: 0 auto;
  opacity: 0;
  transform: translateY(18px);
  transition:
    opacity 0.75s ease,
    transform 0.75s cubic-bezier(0.22, 1, 0.36, 1);
  overflow: visible;
}

.gallery--in {
  opacity: 1;
  transform: translateY(0);
}

.gallery--pending {
  opacity: 0;
  pointer-events: none;
}

.gallery__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 32px;
  padding: 0 6px;
}

.gallery__eyebrow {
  margin: 0;
  font-family: var(--font-display);
  letter-spacing: 0.24em;
  text-transform: uppercase;
  font-size: 0.82rem;
  color: var(--accent-teal);
}

.gallery__title {
  margin: 8px 0 0;
  font-family: var(--font-display);
  font-size: clamp(2.15rem, 7vw, 3.1rem);
  font-weight: 400;
  letter-spacing: 0.08em;
  line-height: 1.15;
}

.gallery__title-glow {
  background: linear-gradient(120deg, #ff7e9d 0%, #c99bff 42%, #5ebfd4 88%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 6px 18px rgba(255, 140, 180, 0.28));
}

.gallery__meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 10px 0 0;
  color: var(--ink-soft);
  font-size: 0.92rem;
}

.gallery__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #fff, var(--accent-rose));
  box-shadow: 0 0 10px rgba(255, 126, 157, 0.7);
  animation: pulse-dot 2.2s ease-in-out infinite;
}

.gallery__exit {
  flex-shrink: 0;
  align-self: flex-start;
  margin-top: 6px;
  appearance: none;
  -webkit-appearance: none;
  border: 0;
  outline: none;
  background: none;
  background-color: transparent;
  color: var(--ink-soft);
  border-radius: 0;
  padding: 4px 2px;
  margin-left: 0;
  font: inherit;
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  line-height: 1;
  opacity: 0.55;
  cursor: pointer;
  box-shadow: none;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 0.2s, color 0.2s;
}

.gallery__exit:hover,
.gallery__exit:active,
.gallery__exit:focus {
  opacity: 0.9;
  color: var(--ink);
  background: none;
  background-color: transparent;
  transform: none;
  box-shadow: none;
}

.exit-confirm {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 24px;
  background-color: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(10px);
}

.exit-confirm__card {
  width: min(300px, 100%);
  padding: 22px 20px 18px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(255, 160, 180, 0.28);
  box-shadow: 0 16px 40px rgba(255, 140, 160, 0.16);
  text-align: center;
}

.exit-confirm__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.15rem;
  letter-spacing: 0.08em;
  color: var(--ink);
}

.exit-confirm__desc {
  margin: 8px 0 0;
  font-size: 0.82rem;
  color: var(--ink-soft);
}

.exit-confirm__actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}

.exit-confirm__btn {
  flex: 1;
  appearance: none;
  -webkit-appearance: none;
  border-radius: 999px;
  padding: 10px 12px;
  font: inherit;
  font-size: 0.86rem;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 0.2s, transform 0.2s;
}

.exit-confirm__btn:hover {
  transform: translateY(-1px);
}

.exit-confirm__btn--ghost {
  border: 1px solid rgba(160, 150, 160, 0.28);
  background: rgba(255, 255, 255, 0.7);
  color: var(--ink-soft);
}

.exit-confirm__btn--danger {
  border: 1px solid rgba(255, 140, 160, 0.35);
  background: linear-gradient(120deg, rgba(255, 126, 157, 0.18), rgba(255, 176, 122, 0.16));
  color: var(--ink);
}

.confirm-enter-active,
.confirm-leave-active {
  transition: opacity 0.22s ease;
}

.confirm-enter-active .exit-confirm__card,
.confirm-leave-active .exit-confirm__card {
  transition:
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.22s;
}

.confirm-enter-from,
.confirm-leave-to {
  opacity: 0;
}

.confirm-enter-from .exit-confirm__card,
.confirm-leave-to .exit-confirm__card {
  opacity: 0;
  transform: scale(0.94) translateY(8px);
}

.gallery__wall {
  min-height: 40vh;
  overflow: visible;
}

.gallery__wall :deep(.waterfall-list) {
  background: transparent !important;
  /* 插件默认 overflow:hidden，会裁掉倾斜卡片的边角 */
  overflow: visible !important;
}

.gallery__wall :deep(.waterfall-item) {
  overflow: visible;
}

.lightbox {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 20px;
  background-color: #ffffff;
  backdrop-filter: blur(16px);
}

.lightbox__aura {
  position: absolute;
  width: min(70vw, 520px);
  height: min(70vw, 520px);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 150, 180, 0.35), rgba(120, 200, 230, 0.18) 55%, transparent 70%);
  filter: blur(20px);
  pointer-events: none;
  animation: aura-breathe 4s ease-in-out infinite;
}

.lightbox__figure {
  position: relative;
  z-index: 1;
  margin: 0;
  max-width: min(920px, 100%);
  max-height: 90svh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.lightbox__img {
  max-width: 100%;
  max-height: 78svh;
  border-radius: 24px;
  box-shadow:
    0 0 0 4px rgba(255, 255, 255, 0.9),
    0 0 0 8px rgba(255, 160, 190, 0.35),
    0 28px 70px rgba(255, 140, 160, 0.22);
  object-fit: contain;
}

.lightbox__cap {
  color: var(--ink);
  font-size: 0.9rem;
  letter-spacing: 0.08em;
  padding: 6px 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 160, 180, 0.28);
  backdrop-filter: blur(8px);
}

.lb-enter-active,
.lb-leave-active {
  transition: opacity 0.32s ease;
}

.lb-enter-active .lightbox__figure,
.lb-leave-active .lightbox__figure {
  transition:
    transform 0.4s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.35s;
}

.lb-enter-from,
.lb-leave-to {
  opacity: 0;
}

.lb-enter-from .lightbox__figure,
.lb-leave-to .lightbox__figure {
  opacity: 0;
  transform: scale(0.9) translateY(16px);
}

@keyframes pulse-dot {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.85;
  }
  50% {
    transform: scale(1.35);
    opacity: 1;
  }
}

@keyframes aura-breathe {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.85;
  }
  50% {
    transform: scale(1.08);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .gallery,
  .gallery__dot,
  .lightbox__aura {
    animation: none;
    transition: none;
  }

  :deep(.loading-fade-leave-active) {
    transition: none;
  }
}

:deep(.loading-fade-leave-active) {
  transition:
    opacity 0.78s ease,
    filter 0.78s ease,
    transform 0.78s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.loading-fade-leave-to) {
  opacity: 0;
  filter: blur(12px);
  transform: scale(1.03);
}
</style>
