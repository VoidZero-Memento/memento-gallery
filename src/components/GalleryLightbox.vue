<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
} from "vue";

import { galleryAccentOf } from "../utils/galleryAccent";
import { computeTargetRect } from "../utils/lightboxRect";

import type { GalleryImage } from "../types/gallery.types";
import type { LightboxOriginRect } from "../types/lightbox.types";

const DURATION_MS = 420;
const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const IDENTITY = "translate3d(0, 0, 0) scale(1, 1)";

const invertTransform = (
  origin: LightboxOriginRect,
  target: LightboxOriginRect,
) => {
  const sx = origin.width / target.width;
  const sy = origin.height / target.height;
  const dx = origin.left - target.left;
  const dy = origin.top - target.top;
  return `translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy})`;
};

const props = defineProps<{
  image: GalleryImage;
  origin: LightboxOriginRect | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

const palette = computed(() => galleryAccentOf(props.image.id));

const opened = ref(false);
const settled = ref(false);
const leaving = ref(false);
const reducedMotion = ref(false);
const flyEl = ref<HTMLElement | null>(null);
const imgEl = ref<HTMLImageElement | null>(null);
const scrimEl = ref<HTMLElement | null>(null);

const initialWidth = 1200;
const initialHeight = Math.max(1, Math.round(initialWidth * props.image.ratio));
const targetRect = shallowRef(computeTargetRect(initialWidth, initialHeight));
const originRect = props.origin ?? targetRect.value;
const enterFrom = invertTransform(originRect, targetRect.value);

/** 首帧就钉在封面位置，避免先闪出居中大图 */
const flyTransform = ref(enterFrom);

let closed = false;
let closeTimer = 0;
let settleTimer = 0;
let flyAnim: Animation | null = null;
let scrimAnim: Animation | null = null;

const finishClose = () => {
  if (closed) return;
  closed = true;
  window.clearTimeout(closeTimer);
  flyAnim?.cancel();
  scrimAnim?.cancel();
  document.documentElement.classList.remove("lightbox-open");
  emit("close");
};

const animateFly = (el: HTMLElement, from: string, to: string) => {
  flyAnim?.cancel();
  flyAnim = el.animate([{ transform: from }, { transform: to }], {
    duration: reducedMotion.value ? 180 : DURATION_MS,
    easing: reducedMotion.value ? "ease" : EASING,
    fill: "forwards",
  });
  return flyAnim;
};

const fadeScrim = (to: number) => {
  const el = scrimEl.value;
  if (!el) return;
  const from = Number(getComputedStyle(el).opacity) || 0;
  scrimAnim?.cancel();
  scrimAnim = el.animate([{ opacity: from }, { opacity: to }], {
    duration: reducedMotion.value ? 160 : 340,
    easing: "ease",
    fill: "forwards",
  });
};

const markOpenedChrome = () => {
  if (leaving.value || closed) return;
  opened.value = true;
  document.documentElement.classList.add("lightbox-open");
  window.clearTimeout(settleTimer);
  settleTimer = window.setTimeout(
    () => {
      if (!leaving.value && !closed) settled.value = true;
    },
    reducedMotion.value ? 160 : DURATION_MS,
  );
};

const requestClose = () => {
  if (leaving.value || closed) return;
  const el = flyEl.value;
  if (!el) {
    finishClose();
    return;
  }

  leaving.value = true;
  opened.value = false;
  settled.value = false;
  window.clearTimeout(settleTimer);
  document.documentElement.classList.remove("lightbox-open");
  fadeScrim(0);

  if (reducedMotion.value) {
    flyTransform.value = enterFrom;
    closeTimer = window.setTimeout(finishClose, 180);
    return;
  }

  flyTransform.value = "";
  el.style.transform = IDENTITY;
  const anim = animateFly(el, IDENTITY, enterFrom);
  const done = () => finishClose();
  void anim.finished.then(done).catch(done);
  closeTimer = window.setTimeout(done, DURATION_MS + 60);
};

const startEnter = async () => {
  reducedMotion.value = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  await nextTick();

  const el = flyEl.value;
  if (!el || closed) return;

  // 最多等约两帧解码，避免既卡飞行中途、又拖慢点击响应
  if (imgEl.value?.decode) {
    await Promise.race([
      imgEl.value.decode().catch(() => undefined),
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, 32);
      }),
    ]);
  }

  if (leaving.value || closed) return;

  if (reducedMotion.value) {
    flyTransform.value = IDENTITY;
    fadeScrim(1);
    markOpenedChrome();
    return;
  }

  fadeScrim(1);
  flyTransform.value = "";
  el.style.transform = enterFrom;
  void el.offsetWidth;
  animateFly(el, enterFrom, IDENTITY);

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(markOpenedChrome);
  });
};

onMounted(() => {
  void startEnter();
});

onUnmounted(() => {
  window.clearTimeout(closeTimer);
  window.clearTimeout(settleTimer);
  flyAnim?.cancel();
  scrimAnim?.cancel();
  document.documentElement.classList.remove("lightbox-open");
});

defineExpose({ requestClose });
</script>

<template>
  <Teleport to="body">
    <div
      class="lightbox"
      role="dialog"
      aria-modal="true"
      :style="{
        '--lb-accent': palette.accent,
        '--lb-glow': palette.glow,
        '--lb-solid': palette.solid,
        '--lb-soft': palette.soft,
        '--lb-deep': palette.deep,
      }"
    >
      <div ref="scrimEl" class="lightbox__scrim" @click="requestClose" />
      <div
        class="lightbox__aura"
        :class="{ 'lightbox__aura--visible': settled }"
        aria-hidden="true"
      />
      <figure
        ref="flyEl"
        class="lightbox__fly"
        :class="{
          'lightbox__fly--reduced': reducedMotion && (!opened || leaving),
        }"
        :style="{
          top: `${targetRect.top}px`,
          left: `${targetRect.left}px`,
          width: `${targetRect.width}px`,
          height: `${targetRect.height}px`,
          transform: flyTransform || undefined,
        }"
        @click.stop
      >
        <span
          class="lightbox__ring"
          :class="{ 'lightbox__ring--on': settled }"
          aria-hidden="true"
        >
          <i class="lightbox__ring-spin" />
        </span>
        <img
          ref="imgEl"
          class="lightbox__img"
          :class="{ 'lightbox__img--settled': settled }"
          :src="image.url"
          :alt="image.name"
          decoding="async"
          fetchpriority="high"
          draggable="false"
        />
        <figcaption
          class="lightbox__cap"
          :class="{ 'lightbox__cap--visible': settled }"
        >
          {{ image.name }}
        </figcaption>
      </figure>
    </div>
  </Teleport>
</template>

<style scoped>
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 50;
  overflow: hidden;
  contain: strict;
  isolation: isolate;
}

.lightbox__scrim {
  position: absolute;
  inset: 0;
  background: #fff;
  opacity: 0;
}

.lightbox__aura {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(78vw, 560px);
  height: min(78vw, 560px);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    var(--lb-glow) 0%,
    var(--lb-accent) 38%,
    transparent 72%
  );
  opacity: 0;
  pointer-events: none;
  transform: translate3d(-50%, -50%, 0);
  transition: opacity 0.35s ease;
}

.lightbox__aura--visible {
  opacity: 0.85;
}

.lightbox__fly {
  position: fixed;
  z-index: 1;
  display: block;
  margin: 0;
  overflow: visible;
  transform-origin: top left;
  will-change: transform;
  backface-visibility: hidden;
}

.lightbox__ring {
  position: absolute;
  /* 露出在白边外侧的流光环，勿被 img 的实心描边盖住 */
  inset: -7px;
  z-index: 0;
  border-radius: 32px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.35s ease;
  /* 整圈底色，避免转的时候半圈发空 */
  background: var(--lb-solid);
  box-shadow:
    0 0 28px var(--lb-glow),
    0 0 56px var(--lb-accent);
}

.lightbox__ring--on {
  opacity: 1;
}

.lightbox__ring-spin {
  position: absolute;
  inset: -45%;
  display: block;
  /* 同色系深浅流转，不用白/透明断档 */
  background: conic-gradient(
    from 0deg,
    var(--lb-solid) 0deg,
    var(--lb-soft) 70deg,
    var(--lb-deep) 140deg,
    var(--lb-solid) 200deg,
    var(--lb-soft) 270deg,
    var(--lb-deep) 330deg,
    var(--lb-solid) 360deg
  );
  animation: lb-orbit 4s linear infinite;
  will-change: transform;
}

.lightbox__img {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 14px;
  box-shadow: 0 8px 28px rgba(180, 120, 150, 0.18);
  object-fit: cover;
  transform: translateZ(0);
  transition:
    border-radius 0.35s ease,
    box-shadow 0.35s ease;
}

.lightbox__img--settled {
  border-radius: 24px;
  object-fit: contain;
  /* 只留白边 + 光影；主题色交给旋转环，避免实心描边盖住动画 */
  box-shadow:
    0 0 0 3px rgba(255, 255, 255, 0.96),
    0 16px 44px rgba(180, 120, 150, 0.24),
    0 32px 80px rgba(180, 120, 150, 0.18),
    0 0 40px var(--lb-glow);
}

.lightbox__cap {
  position: absolute;
  top: calc(100% + 14px);
  left: 50%;
  color: var(--ink);
  font-size: 0.9rem;
  letter-spacing: 0.08em;
  padding: 6px 16px;
  border: 1px solid var(--lb-accent);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  opacity: 0;
  transform: translate3d(-50%, 8px, 0);
  white-space: nowrap;
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
  pointer-events: none;
}

.lightbox__cap--visible {
  opacity: 0.92;
  transform: translate3d(-50%, 0, 0);
}

.lightbox__fly--reduced {
  opacity: 0;
}

@keyframes lb-orbit {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .lightbox__ring-spin {
    animation: none;
  }

  .lightbox__ring--on {
    background: var(--lb-accent);
  }

  .lightbox__ring-spin {
    display: none;
  }
}
</style>

<!-- 灯箱打开时暂停背后卡片无限动画，把 GPU 留给飞入层 -->
<style>
html.lightbox-open .tile,
html.lightbox-open .tile__bob,
html.lightbox-open .tile__frame,
html.lightbox-open .tile__orbit,
html.lightbox-open .tile__glint,
html.lightbox-open .tile__stars,
html.lightbox-open .tile__stars i,
html.lightbox-open .tile__love i {
  animation-play-state: paused !important;
}
</style>
