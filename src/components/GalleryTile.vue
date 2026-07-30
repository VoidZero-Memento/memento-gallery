<script setup lang="ts">
import { computed } from 'vue'

import { LazyImg } from 'vue-waterfall-plugin-next'

import type { GalleryImage } from '../types/gallery.types'

const props = defineProps<{
  item: GalleryImage
  url: string
  index: number
}>()

const emit = defineEmits<{
  open: [img: GalleryImage]
}>()

const tilt = computed(() => {
  const angles = [-2.4, 1.8, -1.2, 2.2, -1.6, 1.4]
  return angles[props.item.id % angles.length]
})

const accent = computed(() => {
  const tones = [
    'rgba(255, 140, 170, 0.55)',
    'rgba(120, 200, 220, 0.55)',
    'rgba(255, 190, 140, 0.55)',
    'rgba(180, 160, 230, 0.5)',
  ]
  return tones[props.item.id % tones.length]
})
</script>

<template>
  <button
    class="tile"
    type="button"
    :style="{ '--tilt': `${tilt}deg`, '--accent': accent, '--delay': `${Math.min(index, 20) * 40}ms` }"
    @click="emit('open', item)"
  >
    <span class="tile__tape" aria-hidden="true" />
    <span class="tile__frame">
      <LazyImg class="tile__img" :url="url" :ratio="item.ratio" />
      <span class="tile__glint" aria-hidden="true" />
      <span class="tile__stars" aria-hidden="true">
        <i /><i /><i />
      </span>
    </span>
  </button>
</template>

<style scoped>
.tile {
  --tilt: 0deg;
  --accent: rgba(255, 140, 170, 0.55);
  --delay: 0ms;
  position: relative;
  display: block;
  width: 100%;
  margin: 0;
  padding: 10px 0 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
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
  display: block;
  overflow: hidden;
  padding: 10px;
  border-radius: 22px 22px 26px 26px;
  background:
    linear-gradient(155deg, rgba(255, 255, 255, 0.92), rgba(255, 245, 250, 0.88) 45%, rgba(240, 250, 255, 0.9));
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.8),
    0 0 0 3px var(--accent),
    0 14px 32px rgba(180, 120, 150, 0.22);
  transition:
    box-shadow 0.4s ease,
    filter 0.4s ease;
}

.tile:hover .tile__frame,
.tile:focus-visible .tile__frame {
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.95),
    0 0 0 4px var(--accent),
    0 22px 48px rgba(255, 130, 170, 0.32),
    0 0 40px rgba(130, 210, 230, 0.25);
  filter: saturate(1.08);
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
  border-radius: 14px;
  background: linear-gradient(115deg, transparent 35%, rgba(255, 255, 255, 0.35) 48%, transparent 62%);
  transform: translateX(-130%);
  pointer-events: none;
}

.tile:hover .tile__glint {
  animation: glint 0.85s ease;
}

.tile__stars {
  position: absolute;
  inset: 14px 14px auto auto;
  width: 28px;
  height: 28px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s;
}

.tile:hover .tile__stars {
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
    transform: rotate(var(--tilt)) translateY(22px) scale(0.92);
  }
  to {
    opacity: 1;
    transform: rotate(var(--tilt)) translateY(0) scale(1);
  }
}

@keyframes glint {
  from {
    transform: translateX(-130%);
  }
  to {
    transform: translateX(130%);
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
  .tile__glint,
  .tile__stars i {
    animation: none;
    transition: none;
  }
}
</style>
