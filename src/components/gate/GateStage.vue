<script setup lang="ts">
import { LOADING_BANNER_URL } from "../../utils/images";

import type { GatePhase } from "../../types/gate.types";

defineProps<{
  phase: GatePhase;
  bannerReady: boolean;
}>();
</script>

<template>
  <div class="stage" :class="`stage--${phase}`" aria-hidden="true">
    <div class="stage__fallback" />

    <div class="stage__drift">
      <img
        class="stage__banner"
        :class="{ 'stage__banner--in': bannerReady }"
        :src="LOADING_BANNER_URL"
        alt=""
        decoding="async"
        fetchpriority="high"
      />
    </div>

    <div class="stage__rays" />
    <div class="stage__veil" />
    <div class="stage__vignette" />
    <div class="stage__seam" />
    <div class="stage__flash" />
  </div>
</template>

<style scoped>
.stage {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.stage__fallback {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      ellipse 90% 70% at 50% 30%,
      #ffe7ef 0%,
      #fff6f9 55%,
      #ffffff 100%
    ),
    linear-gradient(180deg, #fff7fa 0%, #ffffff 100%);
}

.stage__drift {
  position: absolute;
  inset: -4%;
  animation: stage-drift 22s ease-in-out infinite alternate;
}

/* 揭幕用 transition、漂移用父层 keyframes，避免两者争抢 transform */
.stage__banner {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 28%;
  opacity: 0;
  transform: scale(1.16);
  filter: saturate(1.05) brightness(0.94) blur(16px);
  transition:
    opacity 1.5s cubic-bezier(0.22, 1, 0.36, 1),
    transform 2.1s cubic-bezier(0.22, 1, 0.36, 1),
    filter 1.7s cubic-bezier(0.22, 1, 0.36, 1);
}

.stage__banner--in {
  opacity: 1;
  transform: scale(1.04);
  filter: saturate(1.2) brightness(1.05) blur(0);
}

.stage__rays {
  position: absolute;
  left: 50%;
  top: 34%;
  width: 190vmax;
  height: 190vmax;
  translate: -50% -50%;
  opacity: 0;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    rgba(255, 214, 230, 0.5) 8deg,
    transparent 20deg,
    transparent 48deg,
    rgba(255, 232, 210, 0.42) 56deg,
    transparent 70deg,
    transparent 118deg,
    rgba(214, 234, 255, 0.4) 128deg,
    transparent 142deg,
    transparent 210deg,
    rgba(255, 214, 230, 0.45) 220deg,
    transparent 236deg,
    transparent 300deg,
    rgba(236, 220, 255, 0.4) 310deg,
    transparent 326deg
  );
  mask-image: radial-gradient(circle at center, black 0%, transparent 46%);
  animation: rays-turn 64s linear infinite;
  transition: opacity 1.6s ease;
  mix-blend-mode: screen;
}

.stage__veil {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      ellipse 82% 62% at 50% 36%,
      rgba(255, 255, 255, 0.02) 0%,
      rgba(255, 246, 250, 0.16) 46%,
      rgba(255, 255, 255, 0.44) 100%
    ),
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.14) 0%,
      transparent 34%,
      rgba(255, 246, 251, 0.28) 100%
    );
  opacity: 0.55;
  transition: opacity 1.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.stage__vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 76% 66% at 50% 42%,
    transparent 42%,
    rgba(255, 226, 238, 0.34) 78%,
    rgba(255, 255, 255, 0.62) 100%
  );
}

/* 解锁时从中缝裂开的光带 */
.stage__seam {
  position: absolute;
  left: 50%;
  top: -10%;
  bottom: -10%;
  width: 2px;
  translate: -50% 0;
  opacity: 0;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(255, 255, 255, 0.95) 22%,
    #ffffff 50%,
    rgba(255, 255, 255, 0.95) 78%,
    transparent 100%
  );
  box-shadow:
    0 0 30px rgba(255, 190, 215, 0.95),
    0 0 90px rgba(255, 170, 205, 0.7);
}

.stage__flash {
  position: absolute;
  inset: -20%;
  opacity: 0;
  background: radial-gradient(
    circle at 50% 44%,
    #ffffff 0%,
    #fff7fb 46%,
    #ffeef5 100%
  );
}

.stage--intro .stage__veil,
.stage--form .stage__veil {
  opacity: 1;
}

.stage--intro .stage__rays,
.stage--form .stage__rays {
  opacity: 0.75;
}

.stage--form .stage__rays {
  opacity: 0.5;
}

.stage--unlocking .stage__rays {
  opacity: 1;
}

.stage--unlocking .stage__drift {
  animation: stage-recoil 1.5s cubic-bezier(0.65, 0, 0.35, 1) forwards;
}

.stage--unlocking .stage__seam {
  animation: seam-split 1.5s cubic-bezier(0.7, 0, 0.3, 1) forwards;
}

.stage--unlocking .stage__flash {
  animation: flash-bloom 1.5s cubic-bezier(0.7, 0, 0.35, 1) forwards;
}

.stage--done .stage__flash {
  opacity: 1;
}

/* 关门：从「已打开」的白光态反向收回，再交给 intro */
.stage--closing .stage__rays {
  opacity: 1;
}

.stage--closing .stage__drift {
  animation: stage-settle 1.5s cubic-bezier(0.65, 0, 0.35, 1) forwards;
}

.stage--closing .stage__seam {
  animation: seam-close 1.5s cubic-bezier(0.7, 0, 0.3, 1) forwards;
}

.stage--closing .stage__flash {
  animation: flash-recede 1.5s cubic-bezier(0.7, 0, 0.35, 1) forwards;
}

@keyframes stage-drift {
  from {
    transform: scale(1) translate3d(0, 0, 0);
  }
  to {
    transform: scale(1.07) translate3d(-1.2%, -1.6%, 0);
  }
}

@keyframes stage-recoil {
  from {
    transform: scale(1);
    filter: blur(0) brightness(1);
  }
  to {
    transform: scale(1.22);
    filter: blur(14px) brightness(1.45);
  }
}

@keyframes seam-split {
  0% {
    opacity: 0;
    width: 2px;
  }
  18% {
    opacity: 1;
    width: 3px;
  }
  55% {
    opacity: 1;
    width: 12vw;
  }
  100% {
    opacity: 0;
    width: 130vw;
  }
}

@keyframes flash-bloom {
  0% {
    opacity: 0;
    transform: scale(0.35);
  }
  45% {
    opacity: 0.35;
    transform: scale(0.8);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes stage-settle {
  from {
    transform: scale(1.22);
    filter: blur(14px) brightness(1.45);
  }
  to {
    transform: scale(1);
    filter: blur(0) brightness(1);
  }
}

@keyframes seam-close {
  0% {
    opacity: 0;
    width: 130vw;
  }
  35% {
    opacity: 1;
    width: 12vw;
  }
  75% {
    opacity: 1;
    width: 3px;
  }
  100% {
    opacity: 0;
    width: 2px;
  }
}

@keyframes flash-recede {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  55% {
    opacity: 0.35;
    transform: scale(0.8);
  }
  100% {
    opacity: 0;
    transform: scale(0.35);
  }
}

@keyframes rays-turn {
  to {
    rotate: 360deg;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stage__drift,
  .stage__rays,
  .stage--unlocking .stage__drift,
  .stage--unlocking .stage__seam,
  .stage--closing .stage__drift,
  .stage--closing .stage__seam {
    animation: none;
  }

  .stage__banner {
    transition: opacity 0.4s linear;
    transform: scale(1.04);
    filter: saturate(1.2) brightness(1.05);
  }

  .stage--unlocking .stage__flash {
    animation: none;
    opacity: 1;
    transition: opacity 0.3s linear;
  }

  .stage--closing .stage__flash {
    animation: none;
    opacity: 0;
    transition: opacity 0.3s linear;
  }
}
</style>
