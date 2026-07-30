<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

type Spark = {
  id: number
  x: number
  y: number
  size: number
  delay: number
  duration: number
  hue: number
}

const sparks = ref<Spark[]>([])
const orbs = [
  { x: '12%', y: '18%', size: 280, color: 'rgba(255, 170, 190, 0.45)', dur: 18 },
  { x: '78%', y: '12%', size: 320, color: 'rgba(130, 210, 230, 0.4)', dur: 22 },
  { x: '60%', y: '70%', size: 360, color: 'rgba(255, 210, 160, 0.38)', dur: 20 },
  { x: '20%', y: '75%', size: 240, color: 'rgba(180, 230, 200, 0.35)', dur: 16 },
]

const makeSparks = () => {
  sparks.value = Array.from({ length: 42 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 4,
    delay: Math.random() * 8,
    duration: 4 + Math.random() * 6,
    hue: Math.random() > 0.5 ? 340 : 190,
  }))
}

let reduceMotion = false
onMounted(() => {
  reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!reduceMotion) makeSparks()
})
onUnmounted(() => {
  sparks.value = []
})
</script>

<template>
  <div class="dream-bg" aria-hidden="true">
    <div class="dream-bg__wash" />
    <div class="dream-bg__grid" />
    <div
      v-for="(orb, i) in orbs"
      :key="i"
      class="dream-bg__orb"
      :style="{
        left: orb.x,
        top: orb.y,
        width: `${orb.size}px`,
        height: `${orb.size}px`,
        background: orb.color,
        animationDuration: `${orb.dur}s`,
      }"
    />
    <span
      v-for="s in sparks"
      :key="s.id"
      class="dream-bg__spark"
      :style="{
        left: `${s.x}%`,
        top: `${s.y}%`,
        width: `${s.size}px`,
        height: `${s.size}px`,
        animationDelay: `${s.delay}s`,
        animationDuration: `${s.duration}s`,
        background: `hsla(${s.hue}, 90%, 75%, 0.9)`,
        boxShadow: `0 0 10px hsla(${s.hue}, 90%, 70%, 0.8)`,
      }"
    />
  </div>
</template>

<style scoped>
.dream-bg {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
  /* Safari 26+ 采样贴边 fixed 的 background-color 作为顶底栏色；必须给实色，不能只靠子层渐变 */
  background-color: var(--chrome-bg, #ffffff);
}

.dream-bg__wash {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 20% 10%, rgba(255, 200, 210, 0.55), transparent 55%),
    radial-gradient(ellipse 70% 50% at 85% 20%, rgba(160, 220, 240, 0.5), transparent 50%),
    radial-gradient(ellipse 60% 50% at 50% 90%, rgba(255, 220, 170, 0.45), transparent 55%),
    linear-gradient(165deg, #ffffff 0%, #fff5f8 42%, #fff8f0 100%);
}

.dream-bg__grid {
  position: absolute;
  inset: 0;
  opacity: 0.18;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.35) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.35) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
}

.dream-bg__orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(40px);
  transform: translate(-50%, -50%);
  animation: orb-float ease-in-out infinite alternate;
}

.dream-bg__spark {
  position: absolute;
  border-radius: 50%;
  animation: sparkle ease-in-out infinite;
}

@keyframes orb-float {
  from {
    transform: translate(-50%, -50%) scale(1);
  }
  to {
    transform: translate(calc(-50% + 30px), calc(-50% - 40px)) scale(1.12);
  }
}

@keyframes sparkle {
  0%,
  100% {
    opacity: 0.15;
    transform: scale(0.6);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

@media (prefers-reduced-motion: reduce) {
  .dream-bg__orb,
  .dream-bg__spark {
    animation: none;
  }
}
</style>
