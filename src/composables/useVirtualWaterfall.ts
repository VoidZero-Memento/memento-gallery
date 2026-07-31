import { computed, onMounted, onUnmounted, ref, watch, type Ref } from "vue";

import { computeWaterfallLayout, filterVisibleLayoutItems } from "../utils/waterfallLayout";

import type { GalleryImage } from "../types/gallery.types";
import type { WaterfallBreakpoints, WaterfallLayout } from "../types/waterfall.types";

/** 上下各预渲染约 2 屏，降低快滚时空窗露底 */
const overscanPx = () => Math.max(1800, Math.round(window.innerHeight * 2));

type Options = {
  list: Ref<GalleryImage[]>;
  rootRef: Ref<HTMLElement | null>;
  width?: number;
  gutter?: number;
  breakpoints: WaterfallBreakpoints;
};

export const useVirtualWaterfall = (options: Options) => {
  const width = options.width ?? 248;
  const gutter = options.gutter ?? 20;
  const { rootRef } = options;

  const wrapperWidth = ref(0);
  const viewTop = ref(0);
  const viewBottom = ref(0);

  const layout = computed<WaterfallLayout>(() =>
    computeWaterfallLayout(options.list.value, wrapperWidth.value, {
      width,
      gutter,
      breakpoints: options.breakpoints,
    }),
  );

  const visibleItems = computed(() =>
    filterVisibleLayoutItems(layout.value.items, viewTop.value, viewBottom.value),
  );

  const measureWidth = () => {
    const el = rootRef.value;
    if (!el) return;
    wrapperWidth.value = el.clientWidth;
  };

  const updateViewport = () => {
    const el = rootRef.value;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = overscanPx();
    const top = -rect.top - pad;
    const bottom = top + window.innerHeight + pad * 2;
    viewTop.value = top;
    viewBottom.value = bottom;
  };

  let raf = 0;
  const schedule = () => {
    if (raf) return;
    raf = window.requestAnimationFrame(() => {
      raf = 0;
      measureWidth();
      updateViewport();
    });
  };

  let resizeObs: ResizeObserver | null = null;

  onMounted(() => {
    measureWidth();
    updateViewport();
    resizeObs = new ResizeObserver(() => schedule());
    if (rootRef.value) resizeObs.observe(rootRef.value);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
  });

  onUnmounted(() => {
    if (raf) window.cancelAnimationFrame(raf);
    resizeObs?.disconnect();
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
  });

  watch(
    () => options.list.value.length,
    () => schedule(),
  );

  return {
    layout,
    visibleItems,
    cols: computed(() => layout.value.cols),
    ready: computed(() => wrapperWidth.value > 0 && layout.value.items.length > 0),
  };
};
