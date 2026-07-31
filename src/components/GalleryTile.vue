<script setup lang="ts">
import { computed, ref } from "vue";

import { galleryAccentOf } from "../utils/galleryAccent";
import { readOriginRect } from "../utils/lightboxRect";

import type { GalleryImage } from "../types/gallery.types";
import type { LightboxOriginRect } from "../types/lightbox.types";

const props = defineProps<{
  item: GalleryImage;
  url: string;
  index: number;
  /** 当前瀑布流列数，用于同列上下倾角交错 */
  cols: number;
}>();

const emit = defineEmits<{
  open: [img: GalleryImage, origin: LightboxOriginRect];
}>();

const loaded = ref(false);
const imageFrame = ref<HTMLElement | null>(null);

const open = () => {
  const target = imageFrame.value;
  if (!target) return;
  emit("open", props.item, readOriginRect(target));
};

const tilt = computed(() => {
  const magnitudes = [1.5, 1.9, 2.3, 2.7];
  const col = props.index % props.cols;
  const row = Math.floor(props.index / props.cols);
  // 同列上下相反：左一右倾、左二左倾；邻列也错开成棋盘
  const sign = (row + col) % 2 === 0 ? 1 : -1;
  const mag = magnitudes[(props.item.id + row) % magnitudes.length];
  return sign * mag;
});

const palette = computed(() => galleryAccentOf(props.item.id));

/** 约半数卡片偶发扫光，错开相位 */
const spark = computed(() => props.item.id % 2 === 0);

const floatDur = computed(() => `${3.6 + (props.item.id % 5) * 0.4}s`);
const floatDelay = computed(() => `${(props.item.id % 7) * 0.32}s`);
const sparkDelay = computed(() => `${(props.item.id % 5) * 1.1}s`);
const spinDur = computed(() => `${3.2 + (props.item.id % 4) * 0.45}s`);
const aspectRatio = computed(() => `1 / ${props.item.ratio}`);
</script>

<template>
  <button
    class="tile"
    :class="{ 'tile--spark': spark }"
    type="button"
    :style="{
      '--tilt': `${tilt}deg`,
      '--accent': palette.accent,
      '--glow': palette.glow,
      '--solid': palette.solid,
      '--soft': palette.soft,
      '--deep': palette.deep,
      '--delay': `${Math.min(index, 20) * 40}ms`,
      '--float-dur': floatDur,
      '--float-delay': floatDelay,
      '--spark-delay': sparkDelay,
      '--spin-dur': spinDur,
    }"
    @click="open"
  >
    <span class="tile__bob">
      <span class="tile__shell">
        <span class="tile__shell-bleed" aria-hidden="true">
          <span class="tile__orbit" />
        </span>
        <span class="tile__frame">
          <span ref="imageFrame" class="tile__img" :style="{ aspectRatio }">
            <i class="tile__pin" aria-hidden="true" />
            <svg class="tile__cord" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <path d="M50 0 L8 100" />
              <path d="M50 0 L92 100" />
            </svg>
            <i class="tile__eyelet tile__eyelet--l" aria-hidden="true" />
            <i class="tile__eyelet tile__eyelet--r" aria-hidden="true" />
            <span class="tile__img-clip">
              <img
                class="tile__photo"
                :class="{ 'tile__photo--in': loaded }"
                :src="url"
                :alt="item.name"
                loading="lazy"
                decoding="async"
                @load="loaded = true"
              />
              <span class="tile__glint" aria-hidden="true" />
            </span>
          </span>
          <span class="tile__stars" aria-hidden="true"> <i /><i /><i /> </span>
          <span class="tile__love" aria-hidden="true"><i /><i /></span>
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
  --solid: #ff8caa;
  --soft: #ffd0dc;
  --deep: #ff6b9d;
  --delay: 0ms;
  --float-dur: 5s;
  --float-delay: 0s;
  --spark-delay: 0s;
  --spin-dur: 3.6s;
  position: relative;
  display: block;
  width: 100%;
  margin: 0;
  padding: 30px 0 0;
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

/* 挂照：图钉在相框外上方；吊线与孔同坐标系，端点=孔心 */
.tile__img {
  --hang-lift: 22px;
  --eye-x: 8%;
  --eye-y: 8%;
  position: relative;
  display: block;
  width: 100%;
  overflow: visible;
  border-radius: 14px;
}

.tile__img-clip {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  border-radius: 14px;
  background: linear-gradient(145deg, rgba(255, 236, 245, 0.9), rgba(230, 245, 255, 0.85));
}

.tile__pin {
  position: absolute;
  top: calc(var(--hang-lift) * -1);
  left: 50%;
  z-index: 5;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  transform: translate(-50%, -40%);
  pointer-events: none;
  background: radial-gradient(circle at 32% 28%, #fff8ef 0%, var(--soft) 28%, var(--solid) 62%, var(--deep) 100%);
  box-shadow:
    0 1px 3px rgba(60, 40, 70, 0.28),
    0 0 0 1.5px color-mix(in srgb, var(--soft) 70%, white),
    inset 0 1px 1px rgba(255, 255, 255, 0.55);
}

/* 顶=图钉，底=孔心；x 与 --eye-x 对齐 */
.tile__cord {
  position: absolute;
  left: 0;
  width: 100%;
  top: calc(var(--hang-lift) * -1);
  height: calc(var(--hang-lift) + var(--eye-y));
  z-index: 4;
  overflow: visible;
  pointer-events: none;
}

.tile__cord path {
  fill: none;
  stroke: color-mix(in srgb, var(--deep) 35%, #c4a06a);
  stroke-width: 1.5;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
  opacity: 0.92;
}

.tile__eyelet {
  position: absolute;
  top: var(--eye-y);
  z-index: 5;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  background: radial-gradient(circle at 40% 35%, #6a6258 0%, #2c2620 72%);
  box-shadow:
    0 0 0 1.5px rgba(255, 255, 255, 0.55),
    inset 0 0.5px 1px rgba(0, 0, 0, 0.45);
}

.tile__eyelet--l {
  left: var(--eye-x);
}

.tile__eyelet--r {
  left: calc(100% - var(--eye-x));
}

/* 流光旋转描边壳 */
.tile__shell {
  position: relative;
  display: block;
  padding: 2.5px;
  border-radius: 24px 24px 28px 28px;
  overflow: visible;
  isolation: isolate;
  /* 整圈底色，流光只做同色系深浅变化 */
  background: var(--solid);
}

.tile__shell-bleed {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
}

.tile__orbit {
  position: absolute;
  inset: -45%;
  z-index: 0;
  background: conic-gradient(
    from 0deg,
    var(--solid) 0deg,
    var(--soft) 70deg,
    var(--deep) 140deg,
    var(--solid) 200deg,
    var(--soft) 270deg,
    var(--deep) 330deg,
    var(--solid) 360deg
  );
  animation: orbit-spin var(--spin-dur) linear infinite;
  will-change: transform;
  pointer-events: none;
}

.tile__frame {
  position: relative;
  z-index: 1;
  display: block;
  overflow: visible;
  padding: 10px;
  border-radius: 22px 22px 26px 26px;
  background: linear-gradient(
    155deg,
    rgba(255, 255, 255, 0.96),
    rgba(255, 245, 250, 0.92) 45%,
    rgba(240, 250, 255, 0.94)
  );
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.9),
    0 12px 28px rgba(180, 120, 150, 0.18),
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
    0 22px 48px rgba(255, 130, 170, 0.28),
    0 0 36px var(--glow),
    0 0 64px var(--glow);
  filter: saturate(1.08);
  animation: none;
}

.tile:hover .tile__orbit,
.tile:focus-visible .tile__orbit {
  animation-duration: 1.6s;
}

.tile__photo {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 14px;
  opacity: 0;
  transition: opacity 0.45s ease;
}

.tile__photo--in {
  opacity: 1;
}

.tile__glint {
  position: absolute;
  inset: 0;
  z-index: 1;
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

/* 角上小爱心，跟边框同色 */
.tile__love {
  position: absolute;
  inset: 12px;
  z-index: 2;
  pointer-events: none;
}

.tile__love i {
  position: absolute;
  display: block;
  width: 6px;
  height: 6px;
  background: var(--solid);
  border-radius: 1px;
  transform: rotate(45deg);
  opacity: 0.72;
  box-shadow: 0 0 6px var(--glow);
}

.tile__love i::before,
.tile__love i::after {
  content: "";
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: inherit;
}

.tile__love i::before {
  top: -3px;
  left: 0;
}

.tile__love i::after {
  top: 0;
  left: -3px;
}

.tile__love i:nth-child(1) {
  top: 2px;
  left: 2px;
  animation: love-float 3.8s ease-in-out var(--float-delay) infinite;
}

.tile__love i:nth-child(2) {
  right: 4px;
  bottom: 4px;
  width: 5px;
  height: 5px;
  opacity: 0.55;
  animation: love-float 4.4s ease-in-out calc(var(--float-delay) + 0.6s) infinite reverse;
}

.tile__love i:nth-child(2)::before,
.tile__love i:nth-child(2)::after {
  width: 5px;
  height: 5px;
}

.tile__love i:nth-child(2)::before {
  top: -2.5px;
}

.tile__love i:nth-child(2)::after {
  left: -2.5px;
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

@keyframes orbit-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes love-float {
  0%,
  100% {
    transform: rotate(45deg) translate3d(0, 0, 0) scale(0.92);
    opacity: 0.45;
  }
  50% {
    transform: rotate(45deg) translate3d(0, -3px, 0) scale(1.08);
    opacity: 0.85;
  }
}

@keyframes glow-pulse {
  0%,
  100% {
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.9),
      0 12px 28px rgba(180, 120, 150, 0.16),
      0 0 16px var(--glow),
      0 0 36px var(--glow);
  }
  50% {
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.95),
      0 16px 34px rgba(180, 120, 150, 0.24),
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
  .tile__orbit,
  .tile__glint,
  .tile__stars,
  .tile__stars i,
  .tile__love i {
    animation: none;
    transition: none;
  }

  .tile__shell {
    background: var(--accent);
  }

  .tile__orbit {
    display: none;
  }

  .tile__frame {
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.9),
      0 12px 28px rgba(180, 120, 150, 0.2),
      0 0 22px var(--glow),
      0 0 48px var(--glow);
  }
}
</style>
