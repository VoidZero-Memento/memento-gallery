import { computed, onMounted, onUnmounted, ref, watch, type Ref } from "vue";

import { DREAM_BG_FADE_MS, DREAM_BG_INTERVAL_MS, pickNextPhotoIndex, preloadPhoto, toBgPhotoUrl } from "../utils/dreamBgPhotos";

import type { DreamBgPhotoSlot } from "../types/dreamBg.types";

const emptySlot = (): DreamBgPhotoSlot => ({ url: "", visible: false });

export const useDreamBgPhotos = (photoUrls: Ref<string[]>) => {
  const reducedMotion = ref(false);
  const slotA = ref<DreamBgPhotoSlot>(emptySlot());
  const slotB = ref<DreamBgPhotoSlot>(emptySlot());
  const activeIsA = ref(true);

  const hasPhotos = computed(() => photoUrls.value.length > 0);

  let intervalId = 0;
  let lastIndex = -1;
  let generation = 0;

  const processedUrls = () => photoUrls.value.map(toBgPhotoUrl);

  const clearCarousel = () => {
    window.clearInterval(intervalId);
    intervalId = 0;
  };

  const resetSlots = () => {
    slotA.value = emptySlot();
    slotB.value = emptySlot();
    activeIsA.value = true;
    lastIndex = -1;
  };

  const showInitial = (urls: string[]) => {
    const idx = pickNextPhotoIndex(urls.length, -1);
    lastIndex = idx;
    slotA.value = { url: urls[idx], visible: true };
    slotB.value = emptySlot();
    activeIsA.value = true;
  };

  const crossfade = async () => {
    const urls = processedUrls();
    if (urls.length <= 1) return;

    const gen = generation;
    const idx = pickNextPhotoIndex(urls.length, lastIndex);
    const nextUrl = urls[idx];
    await preloadPhoto(nextUrl);
    if (gen !== generation) return;

    lastIndex = idx;

    if (activeIsA.value) {
      slotB.value = { url: nextUrl, visible: false };
      requestAnimationFrame(() => {
        if (gen !== generation) return;
        slotA.value = { ...slotA.value, visible: false };
        slotB.value = { url: nextUrl, visible: true };
        activeIsA.value = false;
      });
      return;
    }

    slotA.value = { url: nextUrl, visible: false };
    requestAnimationFrame(() => {
      if (gen !== generation) return;
      slotB.value = { ...slotB.value, visible: false };
      slotA.value = { url: nextUrl, visible: true };
      activeIsA.value = true;
    });
  };

  const startCarousel = () => {
    generation += 1;
    clearCarousel();
    const urls = processedUrls();
    if (!urls.length) {
      resetSlots();
      return;
    }

    showInitial(urls);
    if (reducedMotion.value || urls.length <= 1) return;

    intervalId = window.setInterval(() => {
      void crossfade();
    }, DREAM_BG_INTERVAL_MS);
  };

  watch(
    () => photoUrls.value.slice(),
    () => startCarousel(),
    { immediate: true },
  );

  onMounted(() => {
    reducedMotion.value = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // 挂载后再读一次 reduced-motion，并在已有 urls 时重启轮播
    if (photoUrls.value.length) startCarousel();
  });

  onUnmounted(() => {
    generation += 1;
    clearCarousel();
  });

  return {
    hasPhotos,
    slotA,
    slotB,
    fadeMs: DREAM_BG_FADE_MS,
  };
};
