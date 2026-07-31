<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";

import { resolveGalleryImages } from "../utils/images";
import { CHROME_THEME, setChromeTheme } from "../utils/theme";

import GalleryLightbox from "./GalleryLightbox.vue";
import GalleryLoading from "./GalleryLoading.vue";
import GalleryTile from "./GalleryTile.vue";
import VirtualWaterfall from "./VirtualWaterfall.vue";

import type { GalleryImage } from "../types/gallery.types";
import type { LightboxOriginRect } from "../types/lightbox.types";

/** 进度补到 100% 的停留时间（与 fill 过渡对齐） */
const FINISH_HOLD_MS = 1000;
/** 加载页淡出时长 */
const LEAVE_MS = 780;
/** afterRender 未触发时的兜底 */
const REVEAL_FALLBACK_MS = 3200;

const emit = defineEmits<{
  exit: [];
  photosChange: [urls: string[]];
}>();

const images = ref<GalleryImage[]>([]);
const prepared = ref(false);
const revealed = ref(false);
const arranging = ref(false);
const progressDone = ref(0);
const progressTotal = ref(0);
const lightbox = ref<GalleryImage | null>(null);
const lightboxOrigin = ref<LightboxOriginRect | null>(null);
const lightboxRef = ref<InstanceType<typeof GalleryLightbox> | null>(null);
const entered = ref(false);
const exitConfirm = ref(false);

/** 与瀑布流列数对齐，供卡片倾角按「同列上下交错」计算 */
const cols = ref(3);

let abortCtrl: AbortController | null = null;
let revealTimer = 0;
let leaveTimer = 0;
let revealStarted = false;
let scrollLocked = false;
let lockedScrollY = 0;

const showLoading = computed(() => !revealed.value);

const setScrollLocked = (locked: boolean) => {
  if (locked === scrollLocked) return;
  const html = document.documentElement;
  const { body } = document;
  if (locked) {
    lockedScrollY = window.scrollY;
    // 不用 body position:fixed，避免打开瞬间重排整页瀑布流导致卡顿
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.touchAction = "none";
    body.style.overscrollBehavior = "none";
  } else {
    html.style.overflow = "";
    body.style.overflow = "";
    body.style.touchAction = "";
    body.style.overscrollBehavior = "";
    window.scrollTo(0, lockedScrollY);
  }
  scrollLocked = locked;
};

const breakpoints = {
  1100: { rowPerView: 3 },
  720: { rowPerView: 2 },
  480: { rowPerView: 2 },
};

const clearRevealTimers = () => {
  window.clearTimeout(revealTimer);
  window.clearTimeout(leaveTimer);
};

const openLightbox = (img: GalleryImage, origin: LightboxOriginRect) => {
  // 先锁滚动再挂载灯箱，避免进场首帧和 body fixed 抢布局
  setScrollLocked(true);
  lightboxOrigin.value = origin;
  lightbox.value = img;
};

const closeLightbox = () => {
  lightboxRef.value?.requestClose();
};

const onLightboxClose = () => {
  lightbox.value = null;
  lightboxOrigin.value = null;
};

const askExit = () => {
  exitConfirm.value = true;
};

const cancelExit = () => {
  exitConfirm.value = false;
};

const confirmExit = () => {
  exitConfirm.value = false;
  emit("exit");
};

const onKey = (e: KeyboardEvent) => {
  if (e.key !== "Escape") return;
  if (exitConfirm.value) {
    cancelExit();
    return;
  }
  closeLightbox();
};

const onColsChange = (value: number) => {
  cols.value = value;
};

/** 先补满进度并短暂停留，再淡出加载页，避免瞬间消失 */
const revealGallery = () => {
  if (revealed.value || !prepared.value || revealStarted) return;
  revealStarted = true;
  arranging.value = true;
  clearRevealTimers();

  revealTimer = window.setTimeout(() => {
    revealed.value = true;
    setChromeTheme(CHROME_THEME.soft);
    leaveTimer = window.setTimeout(
      () => {
        entered.value = true;
      },
      Math.round(LEAVE_MS * 0.45),
    );
  }, FINISH_HOLD_MS);
};

const onWallAfterRender = () => {
  if (!prepared.value || revealed.value || revealStarted) return;
  void nextTick(() => {
    window.requestAnimationFrame(() => {
      revealGallery();
    });
  });
};

const prepare = async () => {
  abortCtrl?.abort();
  clearRevealTimers();
  abortCtrl = new AbortController();
  const { signal } = abortCtrl;

  prepared.value = false;
  revealed.value = false;
  arranging.value = false;
  entered.value = false;
  revealStarted = false;
  images.value = [];
  lightbox.value = null;
  lightboxOrigin.value = null;
  exitConfirm.value = false;
  progressDone.value = 0;
  progressTotal.value = 0;
  setChromeTheme(CHROME_THEME.soft);

  const list = await resolveGalleryImages(({ done, total }) => {
    if (signal.aborted) return;
    progressDone.value = done;
    progressTotal.value = total;
  }, signal);

  if (signal.aborted) return;

  images.value = list;
  prepared.value = true;
  emit(
    "photosChange",
    list.map((img) => img.url),
  );

  clearRevealTimers();
  revealTimer = window.setTimeout(() => {
    if (!signal.aborted) revealGallery();
  }, REVEAL_FALLBACK_MS);
};

watch(
  () => !!(showLoading.value || lightbox.value || exitConfirm.value),
  (locked) => {
    // 加载页 / lightbox / 退出确认期间锁滚动；lightbox 打开时已在 openLightbox 里提前锁定
    setScrollLocked(locked);
  },
  { immediate: true },
);

watch(
  () => (prepared.value ? images.value.map((img) => img.url) : []),
  (urls) => {
    emit("photosChange", urls);
  },
  { immediate: true },
);

onMounted(() => {
  void prepare();
  window.addEventListener("keydown", onKey);
});

onUnmounted(() => {
  emit("photosChange", []);
  abortCtrl?.abort();
  clearRevealTimers();
  setScrollLocked(false);
  setChromeTheme(CHROME_THEME.soft);
  window.removeEventListener("keydown", onKey);
});
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
      <button class="gallery__exit" type="button" @click="askExit">离开</button>
      <div class="gallery__brand">
        <p class="gallery__eyebrow">Memento Gallery</p>
        <h1 class="gallery__title">
          <span class="gallery__title-glow">软糖星河</span>
        </h1>
        <p class="gallery__meta">
          <span class="gallery__dot" />
          {{ images.length }} 帧记忆漂浮中
        </p>
        <div class="gallery__ornament" aria-hidden="true">
          <span class="gallery__ornament-line" />
          <span class="gallery__ornament-gem" />
          <span class="gallery__ornament-line" />
        </div>
      </div>
    </header>

    <div class="gallery__stage">
      <div class="gallery__stardust" aria-hidden="true">
        <span
          v-for="n in 18"
          :key="n"
          class="gallery__dust"
          :style="{
            '--x': `${(n * 37) % 100}%`,
            '--y': `${(n * 53) % 100}%`,
            '--s': `${1.2 + (n % 4) * 0.7}px`,
            '--o': `${0.22 + (n % 5) * 0.1}`,
            '--dur': `${10 + (n % 6) * 2.4}s`,
            '--delay': `${(n % 9) * -1.1}s`,
          }"
        />
      </div>

      <VirtualWaterfall
        class="gallery__wall"
        :list="images"
        :width="248"
        :gutter="20"
        :breakpoints="breakpoints"
        @after-render="onWallAfterRender"
        @cols-change="onColsChange"
      >
        <template #default="{ item, url, index, cols: wallCols }">
          <GalleryTile
            :item="item"
            :url="url"
            :index="index"
            :cols="wallCols || cols"
            @open="openLightbox"
          />
        </template>
      </VirtualWaterfall>
    </div>

    <GalleryLightbox
      v-if="lightbox"
      ref="lightboxRef"
      :image="lightbox"
      :origin="lightboxOrigin"
      @close="onLightboxClose"
    />

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
            <p id="exit-confirm-title" class="exit-confirm__title">
              确定离开吗？
            </p>
            <p class="exit-confirm__desc">离开后需重新进入记忆之门</p>
            <div class="exit-confirm__actions">
              <button
                class="exit-confirm__btn exit-confirm__btn--stay"
                type="button"
                @click="cancelExit"
              >
                再看看
              </button>
              <button
                class="exit-confirm__btn exit-confirm__btn--leave"
                type="button"
                @click="confirmExit"
              >
                轻轻离开
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
  padding: max(28px, env(safe-area-inset-top, 0px)) 28px
    max(36px, calc(20px + env(safe-area-inset-bottom, 0px)));
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
  position: relative;
  display: grid;
  place-items: center;
  margin-bottom: 40px;
  padding: 12px 48px 8px;
}

.gallery__header::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(420px, 88%);
  height: 140px;
  transform: translate(-50%, -52%);
  border-radius: 50%;
  background:
    radial-gradient(
      ellipse at 50% 40%,
      rgba(255, 160, 190, 0.22),
      transparent 68%
    ),
    radial-gradient(
      ellipse at 30% 60%,
      rgba(94, 191, 212, 0.12),
      transparent 60%
    );
  filter: blur(18px);
  pointer-events: none;
  animation: header-aura 5.5s ease-in-out infinite;
}

.gallery__brand {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 36rem;
}

.gallery__ornament {
  display: flex;
  align-items: center;
  gap: 10px;
  width: min(220px, 58vw);
  margin: 16px 0 0;
  opacity: 0.72;
}

.gallery__ornament-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 140, 170, 0.45),
    rgba(94, 191, 212, 0.4),
    transparent
  );
}

.gallery__ornament-gem {
  width: 6px;
  height: 6px;
  rotate: 45deg;
  border-radius: 1px;
  background: linear-gradient(135deg, #ff9bb4, #7ecfe0);
  box-shadow: 0 0 10px rgba(255, 140, 180, 0.45);
  animation: gem-twinkle 3.2s ease-in-out infinite;
}

.gallery__eyebrow {
  margin: 0;
  font-family: var(--font-display);
  letter-spacing: 0.32em;
  text-indent: 0.32em;
  text-transform: uppercase;
  font-size: 0.78rem;
  color: var(--accent-teal);
  opacity: 0.88;
}

.gallery__title {
  margin: 10px 0 0;
  font-family: var(--font-display);
  font-size: clamp(2.35rem, 8vw, 3.35rem);
  font-weight: 400;
  letter-spacing: 0.16em;
  text-indent: 0.16em;
  line-height: 1.12;
}

.gallery__title-glow {
  background: linear-gradient(
    115deg,
    #ff8aa8 0%,
    #ffb07a 28%,
    #c9a0ef 55%,
    #5ebfd4 100%
  );
  background-size: 180% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 8px 22px rgba(255, 140, 180, 0.26));
  animation: title-shimmer 7s ease-in-out infinite;
}

.gallery__meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 14px 0 0;
  padding: 5px 12px;
  color: var(--ink-soft);
  font-size: 0.88rem;
  letter-spacing: 0.04em;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.42);
  border: 1px solid rgba(255, 170, 190, 0.22);
  backdrop-filter: blur(6px);
}

.gallery__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #fff, var(--accent-rose));
  box-shadow: 0 0 10px rgba(255, 126, 157, 0.7);
  animation: pulse-dot 2.2s ease-in-out infinite;
}

.gallery__exit {
  position: absolute;
  top: 2px;
  right: 2px;
  z-index: 2;
  appearance: none;
  -webkit-appearance: none;
  border: 0;
  outline: none;
  background: none;
  background-color: transparent;
  color: var(--ink-soft);
  border-radius: 0;
  padding: 4px 2px;
  margin: 0;
  font: inherit;
  font-size: 0.68rem;
  letter-spacing: 0.04em;
  line-height: 1;
  opacity: 0.22;
  cursor: pointer;
  box-shadow: none;
  -webkit-tap-highlight-color: transparent;
  transition:
    opacity 0.25s,
    color 0.25s;
}

.gallery__exit:hover,
.gallery__exit:active,
.gallery__exit:focus {
  opacity: 0.48;
  color: var(--ink-soft);
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
  margin-top: 20px;
}

.exit-confirm__btn {
  flex: 1;
  appearance: none;
  -webkit-appearance: none;
  border-radius: 14px;
  padding: 11px 12px;
  font: inherit;
  font-size: 0.86rem;
  letter-spacing: 0.08em;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    transform 0.2s,
    background-color 0.2s,
    border-color 0.2s,
    color 0.2s;
}

.exit-confirm__btn:hover {
  transform: translateY(-1px);
}

.exit-confirm__btn--stay {
  border: 1px solid rgba(255, 140, 160, 0.42);
  background: linear-gradient(
    145deg,
    rgba(255, 200, 180, 0.55),
    rgba(255, 143, 168, 0.42)
  );
  color: var(--ink);
}

.exit-confirm__btn--stay:hover {
  border-color: rgba(255, 126, 157, 0.55);
  background: linear-gradient(
    145deg,
    rgba(255, 200, 180, 0.72),
    rgba(255, 143, 168, 0.55)
  );
}

.exit-confirm__btn--leave {
  border: 1px solid rgba(255, 160, 180, 0.22);
  background: rgba(255, 248, 250, 0.72);
  color: var(--ink-soft);
}

.exit-confirm__btn--leave:hover {
  border-color: rgba(255, 140, 160, 0.36);
  color: var(--ink);
  background: rgba(255, 255, 255, 0.92);
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

.gallery__stage {
  position: relative;
}

.gallery__stardust {
  position: absolute;
  inset: -24px -12px;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.gallery__dust {
  position: absolute;
  top: var(--y);
  left: var(--x);
  width: var(--s);
  height: var(--s);
  border-radius: 50%;
  background: radial-gradient(
    circle at 30% 30%,
    #fff,
    rgba(255, 180, 210, 0.85) 55%,
    transparent 75%
  );
  opacity: var(--o);
  box-shadow: 0 0 8px rgba(255, 170, 200, 0.55);
  animation: dust-drift var(--dur) ease-in-out var(--delay) infinite;
}

.gallery__dust:nth-child(3n) {
  background: radial-gradient(
    circle at 30% 30%,
    #fff,
    rgba(140, 210, 230, 0.9) 55%,
    transparent 75%
  );
  box-shadow: 0 0 8px rgba(120, 200, 220, 0.5);
}

.gallery__dust:nth-child(4n) {
  width: calc(var(--s) * 1.6);
  height: calc(var(--s) * 1.6);
  filter: blur(0.4px);
}

.gallery__wall {
  position: relative;
  z-index: 1;
  min-height: 40vh;
  overflow: visible;
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

@keyframes gem-twinkle {
  0%,
  100% {
    opacity: 0.7;
    transform: rotate(45deg) scale(1);
  }
  50% {
    opacity: 1;
    transform: rotate(45deg) scale(1.2);
  }
}

@keyframes title-shimmer {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes header-aura {
  0%,
  100% {
    opacity: 0.75;
    transform: translate(-50%, -52%) scale(1);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, -52%) scale(1.06);
  }
}

@keyframes dust-drift {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
    opacity: var(--o);
  }
  40% {
    transform: translate(10px, -18px) scale(1.25);
    opacity: calc(var(--o) * 1.35);
  }
  70% {
    transform: translate(-8px, -8px) scale(0.9);
    opacity: calc(var(--o) * 0.65);
  }
}

@media (prefers-reduced-motion: reduce) {
  .gallery,
  .gallery__dot,
  .gallery__ornament-gem,
  .gallery__title-glow,
  .gallery__header::before,
  .gallery__dust {
    animation: none;
    transition: none;
  }

  :deep(.loading-fade-leave-active) {
    transition: none;
  }
}

@media (max-width: 480px) {
  .gallery__header {
    padding: 8px 40px 4px;
    margin-bottom: 28px;
  }

  .gallery__exit {
    top: 0;
    right: 0;
    opacity: 0.18;
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
