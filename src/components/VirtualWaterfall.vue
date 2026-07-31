<script setup lang="ts">
import { ref, toRef, watch } from "vue";

import { useVirtualWaterfall } from "../composables/useVirtualWaterfall";

import type { GalleryImage } from "../types/gallery.types";
import type { WaterfallBreakpoints, WaterfallLayoutItem } from "../types/waterfall.types";

const props = withDefaults(
  defineProps<{
    list: GalleryImage[];
    width?: number;
    gutter?: number;
    breakpoints: WaterfallBreakpoints;
  }>(),
  {
    width: 248,
    gutter: 20,
  },
);

const emit = defineEmits<{
  afterRender: [];
  colsChange: [cols: number];
}>();

const rootRef = ref<HTMLElement | null>(null);

const { layout, visibleItems, cols, ready } = useVirtualWaterfall({
  list: toRef(props, "list"),
  rootRef,
  width: props.width,
  gutter: props.gutter,
  breakpoints: props.breakpoints,
});

watch(
  ready,
  (ok) => {
    if (ok) emit("afterRender");
  },
  { immediate: true },
);

watch(
  cols,
  (value) => {
    if (value > 0) emit("colsChange", value);
  },
  { immediate: true },
);

defineSlots<{
  default: (props: {
    item: GalleryImage;
    url: string;
    index: number;
    cols: number;
    entry: WaterfallLayoutItem;
  }) => unknown;
}>();
</script>

<template>
  <div
    ref="rootRef"
    class="virtual-wall"
    :style="{ height: `${layout.height}px` }"
  >
    <div
      v-for="entry in visibleItems"
      :key="entry.item.id"
      class="virtual-wall__item"
      :style="{
        width: `${entry.width}px`,
        height: `${entry.height}px`,
        transform: `translate3d(${Math.floor(entry.x)}px, ${Math.floor(entry.y)}px, 0)`,
      }"
    >
      <slot
        :item="entry.item"
        :url="entry.item.url"
        :index="entry.index"
        :cols="cols"
        :entry="entry"
      />
    </div>
  </div>
</template>

<style scoped>
.virtual-wall {
  position: relative;
  width: 100%;
  min-height: 40vh;
  overflow: visible;
}

.virtual-wall__item {
  position: absolute;
  top: 0;
  left: 0;
  /* 给光晕留出绘制空间，避免真机被裁切 */
  padding: 10px 6px 14px;
  margin: -10px -6px -14px;
  box-sizing: content-box;
  overflow: visible;
}
</style>
