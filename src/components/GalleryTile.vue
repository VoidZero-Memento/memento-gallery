<script setup lang="ts">
import { computed } from 'vue'

import { LazyImg } from 'vue-waterfall-plugin-next'

import type { GalleryImage } from '../types/gallery.types'

const props = defineProps<{
  item: GalleryImage
  url: string
  index: number
  /** 当前瀑布流列数，用于同列上下倾角交错 */
  cols: number
}>()

const emit = defineEmits<{
  open: [img: GalleryImage]
}>()

const tilt = computed(() => {
  const magnitudes = [1.5, 1.9, 2.3, 2.7]
  const col = props.index % props.cols
  const row = Math.floor(props.index / props.cols)
  // 同列上下相反：左一右倾、左二左倾；邻列也错开成棋盘
  const sign = (row + col) % 2 === 0 ? 1 : -1
  const mag = magnitudes[(props.item.id + row) % magnitudes.length]
  return sign * mag
})

const accent = computed(() => {
  const tones = [
    'rgba(255, 140, 170, 0.7)',
    'rgba(120, 200, 220, 0.7)',
    'rgba(255, 190, 140, 0.7)',
    'rgba(180, 160, 230, 0.65)',
  ]
  return tones[props.item.id % tones.length]
})

/** 外发光色：不用 color-mix，避免真机整段 box-shadow 失效 */
const glow = computed(() => {
  const tones = [
    'rgba(255, 140, 170, 0.45)',
    'rgba(120, 200, 220, 0.42)',
    'rgba(255, 190, 140, 0.42)',
    'rgba(180, 160, 230, 0.4)',
  ]
  return tones[props.item.id % tones.length]
})

/** 约半数卡片偶发扫光，错开相位 */
const spark = computed(() => props.item.id % 2 === 0)

const floatDur = computed(() => `${3.6 + (props.item.id % 5) * 0.4}s`)
const floatDelay = computed(() => `${(props.item.id % 7) * 0.32}s`)
const sparkDelay = computed(() => `${(props.item.id % 5) * 1.1}s`)
</script>

<template>
  <button
    class="tile"
    :class="{ 'tile--spark': spark }"
    type="button"
    :style="{
      '--tilt': `${tilt}deg`,
      '--accent': accent,
      '--glow': glow,
      '--delay': `${Math.min(index, 20) * 40}ms`,
      '--float-dur': floatDur,
      '--float-delay': floatDelay,
      '--spark-delay': sparkDelay,
    }"
    @click="emit('open', item)"
  >
    <span class="tile__bob">
      <span class="tile__tape" aria-hidden="true" />
      <span class="tile__frame">
        <LazyImg class="tile__img" :url="url" :ratio="item.ratio" />
        <span class="tile__glint" aria-hidden="true" />
        <span class="tile__stars" aria-hidden="true">
          <i /><i /><i />
        </span>
      </span>
    </span>
  </button>
</template>

<style scoped>
.tile {
  --tilt: 0deg;
  --accent: rgba(255, 140, 170, 0.7);
  --glow: rgba(255, 140, 170, 0.45);
  --delay: 0ms;
  --float-dur: 5s;
  --float-delay: 0s;
  --spark-delay: 0s;
  position: relative;
  display: block;
  width: 100%;
  margin: 0;
  padding: 10px 0 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
  transform: rotate(var(--tilt));
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
  animation: tile-pop 0.75s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--delay);
}

.tile:hover,
.tile:focus-visible {
  transform: rotate(0deg) translateY(-6px) scale(1.03);
  outline: none;
  z-index: 2;
}

.tile:hover .tile__bob,
.tile:focus-visible .tile__bob {
  animation-play-state: paused;
}

.tile__bob {
  display: block;
  position: relative;
  /* 用 translate3d 强制真机开 GPU，避免动画被合成层吞掉 */
  animation: tile-float var(--float-dur) ease-in-out var(--float-delay) infinite;
  will-change: transform;
}

.tile__tape {
  position: absolute;
  top: -6px;
  left: 50%;
  z-index: 3;
  width: 42%;
  height: 16px;
  transform: translateX(-50%) rotate(-2deg);
  border-radius: 2px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.75), rgba(255, 220, 235, 0.55));
  box-shadow: 0 1px 4px rgba(80, 50, 70, 0.12);
  opacity: 0.85;
  pointer-events: none;
}

.tile__frame {
  position: relative;
  z-index: 1;
  display: block;
  overflow: hidden;
  padding: 10px;
  border-radius: 22px 22px 26px 26px;
  background:
    linear-gradient(155deg, rgba(255, 255, 255, 0.92), rgba(255, 245, 250, 0.88) 45%, rgba(240, 250, 255, 0.9));
  /* 光晕用 box-shadow，不用 filter:blur（真机在 transform 父级下常被裁切/几乎看不见） */
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.85),
    0 0 0 3px var(--accent),
    0 12px 28px rgba(180, 120, 150, 0.2),
    0 0 22px var(--glow),
    0 0 48px var(--glow);
  animation: glow-pulse 4.6s ease-in-out var(--float-delay) infinite;
  transition:
    box-shadow 0.4s ease,
    filter 0.4s ease;
}

.tile:hover .tile__frame,
.tile:focus-visible .tile__frame,
.tile:active .tile__frame {
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.95),
    0 0 0 4px var(--accent),
    0 22px 48px rgba(255, 130, 170, 0.32),
    0 0 36px var(--glow),
    0 0 64px rgba(130, 210, 230, 0.28);
  filter: saturate(1.08);
  animation: none;
}

.tile__img {
  display: block;
  width: 100%;
  border-radius: 14px;
  overflow: hidden;
}

.tile__img :deep(.lazy__box) {
  border-radius: 14px;
  overflow: hidden;
  background: linear-gradient(145deg, rgba(255, 236, 245, 0.9), rgba(230, 245, 255, 0.85));
}

.tile__img :deep(.lazy__img[lazy='loaded']) {
  border-radius: 14px;
}

.tile__img :deep(.lazy__img[lazy='loading']),
.tile__img :deep(.lazy__img[lazy='error']) {
  opacity: 0.35;
  object-fit: cover;
}

.tile__glint {
  position: absolute;
  inset: 10px;
  z-index: 2;
  border-radius: 14px;
  background: linear-gradient(
    115deg,
    transparent 32%,
    rgba(255, 255, 255, 0.55) 48%,
    transparent 64%
  );
  transform: translate3d(-130%, 0, 0);
  pointer-events: none;
}

/* 全部卡片都有低频扫光；spark 更密一些 */
.tile .tile__glint {
  animation: glint-idle 8.5s ease-in-out var(--spark-delay) infinite;
}

.tile--spark .tile__glint {
  animation: glint-idle 5.8s ease-in-out var(--spark-delay) infinite;
}

.tile:hover .tile__glint,
.tile:focus-visible .tile__glint,
.tile:active .tile__glint {
  animation: glint 0.85s ease;
}

.tile__stars {
  position: absolute;
  inset: 14px 14px auto auto;
  z-index: 2;
  width: 28px;
  height: 28px;
  pointer-events: none;
  opacity: 0;
}

.tile--spark .tile__stars {
  animation: stars-peek 5.8s ease-in-out var(--spark-delay) infinite;
}

.tile:hover .tile__stars,
.tile:focus-visible .tile__stars,
.tile:active .tile__stars {
  animation: none;
  opacity: 1;
}

.tile__stars i {
  position: absolute;
  display: block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 8px rgba(255, 220, 240, 0.95);
  animation: twinkle 1.4s ease-in-out infinite;
}

.tile__stars i:nth-child(1) {
  top: 0;
  right: 2px;
}

.tile__stars i:nth-child(2) {
  top: 12px;
  right: 14px;
  width: 3px;
  height: 3px;
  animation-delay: 0.25s;
}

.tile__stars i:nth-child(3) {
  top: 4px;
  right: 18px;
  width: 4px;
  height: 4px;
  animation-delay: 0.5s;
}

@keyframes tile-pop {
  from {
    opacity: 0;
    transform: rotate(var(--tilt)) translate3d(0, 22px, 0) scale(0.92);
  }
  to {
    opacity: 1;
    transform: rotate(var(--tilt)) translate3d(0, 0, 0) scale(1);
  }
}

@keyframes tile-float {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }
  50% {
    transform: translate3d(0, -7px, 0);
  }
}

@keyframes glow-pulse {
  0%,
  100% {
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.85),
      0 0 0 3px var(--accent),
      0 12px 28px rgba(180, 120, 150, 0.18),
      0 0 16px var(--glow),
      0 0 36px var(--glow);
  }
  50% {
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.95),
      0 0 0 3px var(--accent),
      0 16px 34px rgba(180, 120, 150, 0.26),
      0 0 28px var(--glow),
      0 0 58px var(--glow);
  }
}

@keyframes glint {
  from {
    transform: translate3d(-130%, 0, 0);
  }
  to {
    transform: translate3d(130%, 0, 0);
  }
}

@keyframes glint-idle {
  0%,
  78%,
  100% {
    transform: translate3d(-130%, 0, 0);
  }
  84%,
  92% {
    transform: translate3d(130%, 0, 0);
  }
}

@keyframes stars-peek {
  0%,
  78%,
  100% {
    opacity: 0;
  }
  84%,
  92% {
    opacity: 0.9;
  }
}

@keyframes twinkle {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.25);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tile,
  .tile__bob,
  .tile__frame,
  .tile__glint,
  .tile__stars,
  .tile__stars i {
    animation: none;
    transition: none;
  }

  .tile__frame {
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.85),
      0 0 0 3px var(--accent),
      0 12px 28px rgba(180, 120, 150, 0.2),
      0 0 22px var(--glow),
      0 0 48px var(--glow);
  }
}
</style>
