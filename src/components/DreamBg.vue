<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

import { useDreamBgPhotos } from "../composables/useDreamBgPhotos";

type Spark = {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  hue: number;
};

const props = withDefaults(
  defineProps<{
    photoUrls?: string[];
  }>(),
  {
    photoUrls: () => [],
  },
);

const sparks = ref<Spark[]>([]);
const orbs = [
  { x: "12%", y: "18%", size: 280, color: "rgba(255, 170, 190, 0.45)", dur: 18 },
  { x: "78%", y: "12%", size: 320, color: "rgba(130, 210, 230, 0.4)", dur: 22 },
  { x: "60%", y: "70%", size: 360, color: "rgba(255, 210, 160, 0.38)", dur: 20 },
  { x: "20%", y: "75%", size: 240, color: "rgba(180, 230, 200, 0.35)", dur: 16 },
];

const urlsRef = computed(() => props.photoUrls);
const { hasPhotos, slotA, slotB, fadeMs } = useDreamBgPhotos(urlsRef);

const makeSparks = () => {
  sparks.value = Array.from({ length: 42 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 4,
    delay: Math.random() * 8,
    duration: 4 + Math.random() * 6,
    hue: Math.random() > 0.5 ? 340 : 190,
  }));
};

onMounted(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion) makeSparks();
});
onUnmounted(() => {
  sparks.value = [];
});
</script>

<template>
  <div class="dream-bg" :class="{ 'dream-bg--photos': hasPhotos }" aria-hidden="true">
    <div class="dream-bg__wash" />
    <div v-if="hasPhotos" class="dream-bg__photos">
      <img
        v-if="slotA.url"
        class="dream-bg__photo"
        :class="{ 'dream-bg__photo--visible': slotA.visible }"
        :src="slotA.url"
        alt=""
        decoding="async"
        :style="{ transitionDuration: `${fadeMs}ms` }"
      />
      <img
        v-if="slotB.url"
        class="dream-bg__photo"
        :class="{ 'dream-bg__photo--visible': slotB.visible }"
        :src="slotB.url"
        alt=""
        decoding="async"
        :style="{ transitionDuration: `${fadeMs}ms` }"
      />
      <div class="dream-bg__photos-frost" />
    </div>
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

.dream-bg__photos {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.dream-bg__photo {
  position: absolute;
  inset: -8%;
  width: 116%;
  height: 116%;
  object-fit: cover;
  object-position: center;
  opacity: 0;
  transform: scale(1.04);
  filter: blur(8px) saturate(1.14) brightness(1.03);
  transition: opacity ease-in-out;
  will-change: opacity;
}

.dream-bg__photo--visible {
  opacity: 1;
}

.dream-bg__photos-frost {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(165deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 248, 252, 0.06) 55%, rgba(255, 248, 240, 0.08) 100%);
}

/* 有照片时 wash 只做淡色晕，不再铺实色白底 */
.dream-bg--photos .dream-bg__wash {
  background:
    radial-gradient(ellipse 80% 60% at 20% 10%, rgba(255, 200, 210, 0.12), transparent 55%),
    radial-gradient(ellipse 70% 50% at 85% 20%, rgba(160, 220, 240, 0.1), transparent 50%),
    radial-gradient(ellipse 60% 50% at 50% 90%, rgba(255, 220, 170, 0.08), transparent 55%);
}

.dream-bg--photos .dream-bg__orb {
  opacity: 0.28;
}

.dream-bg--photos .dream-bg__grid {
  opacity: 0.1;
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
  .dream-bg__photo {
    transition: none;
  }

  .dream-bg__orb,
  .dream-bg__spark {
    animation: none;
  }
}
</style>
