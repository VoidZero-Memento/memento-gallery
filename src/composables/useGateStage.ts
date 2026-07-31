import { onMounted, onUnmounted, ref } from "vue";

import { LOADING_BANNER_URL } from "../utils/images";

import type { GatePhase } from "../types/gate.types";

/** banner 走 OSS，网络差时不能把用户永远卡在开场，到点就放行 */
const BOOT_MAX_MS = 1700;
const INTRO_MS = 2300;
const UNLOCK_MS = 1500;
const UNLOCK_MS_REDUCED = 160;
const CLOSE_MS = 1500;
const CLOSE_MS_REDUCED = 160;
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

export type UseGateStageOptions = {
  /** 从画廊返回：先播关门，再走完整 intro */
  reenter?: boolean;
};

export const useGateStage = (options: UseGateStageOptions = {}) => {
  const reenter = Boolean(options.reenter);
  const phase = ref<GatePhase>(reenter ? "closing" : "booting");
  const bannerReady = ref(reenter);
  const reduceMotion = ref(false);

  let bootTimer = 0;
  let introTimer = 0;
  let unlockTimer = 0;
  let closeTimer = 0;
  let media: MediaQueryList | null = null;
  let disposed = false;

  const onMediaChange = (e: MediaQueryListEvent) => {
    reduceMotion.value = e.matches;
  };

  const enterForm = () => {
    window.clearTimeout(introTimer);
    if (disposed || phase.value !== "intro") return;
    phase.value = "form";
  };

  const startIntro = () => {
    if (disposed) return;
    if (reduceMotion.value) {
      phase.value = "form";
      return;
    }
    phase.value = "intro";
    introTimer = window.setTimeout(enterForm, INTRO_MS);
  };

  const enterIntro = () => {
    window.clearTimeout(bootTimer);
    if (disposed || phase.value !== "booting") return;
    startIntro();
  };

  const preloadBanner = async () => {
    const img = new Image();
    img.decoding = "async";
    img.src = LOADING_BANNER_URL;
    const settled =
      typeof img.decode === "function"
        ? img.decode()
        : new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("banner load failed"));
          });
    try {
      await settled;
    } catch {
      // 解码失败也要揭幕，背景降级为纯渐变，不能把用户锁死在开场
    }
    if (!disposed) bannerReady.value = true;
  };

  /** 开场只是仪式，允许点击跳过 */
  const skipIntro = () => {
    if (phase.value === "intro") enterForm();
  };

  const beginUnlock = (onDone: () => void) => {
    if (phase.value === "unlocking" || phase.value === "done") return;
    window.clearTimeout(introTimer);
    window.clearTimeout(closeTimer);
    phase.value = "unlocking";
    unlockTimer = window.setTimeout(
      () => {
        if (disposed) return;
        phase.value = "done";
        onDone();
      },
      reduceMotion.value ? UNLOCK_MS_REDUCED : UNLOCK_MS,
    );
  };

  const beginClose = () => {
    phase.value = "closing";
    closeTimer = window.setTimeout(
      () => {
        if (disposed) return;
        startIntro();
      },
      reduceMotion.value ? CLOSE_MS_REDUCED : CLOSE_MS,
    );
  };

  onMounted(() => {
    media = window.matchMedia(REDUCED_QUERY);
    reduceMotion.value = media.matches;
    media.addEventListener("change", onMediaChange);

    if (reenter) {
      bannerReady.value = true;
      void preloadBanner();
      beginClose();
      return;
    }

    bootTimer = window.setTimeout(enterIntro, BOOT_MAX_MS);
    void preloadBanner().then(enterIntro);
  });

  onUnmounted(() => {
    disposed = true;
    window.clearTimeout(bootTimer);
    window.clearTimeout(introTimer);
    window.clearTimeout(unlockTimer);
    window.clearTimeout(closeTimer);
    media?.removeEventListener("change", onMediaChange);
  });

  return { phase, bannerReady, reduceMotion, skipIntro, beginUnlock };
};
