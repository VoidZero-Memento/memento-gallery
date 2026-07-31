<script setup lang="ts">
import { onMounted, ref, watch } from "vue";

import DreamBg from "./components/DreamBg.vue";
import GalleryView from "./components/GalleryView.vue";
import GateView from "./components/GateView.vue";
import { clearGateSession, loadGateSession } from "./utils/session";
import { CHROME_THEME, setChromeTheme } from "./utils/theme";

const unlocked = ref(false);
const reenter = ref(false);
const galleryPhotos = ref<string[]>([]);

onMounted(() => {
  unlocked.value = loadGateSession();
});

watch(
  unlocked,
  (v) => {
    if (!v) setChromeTheme(CHROME_THEME.soft);
  },
  { immediate: true },
);

const onSuccess = () => {
  reenter.value = false;
  unlocked.value = true;
};

const onExit = () => {
  galleryPhotos.value = [];
  clearGateSession();
  reenter.value = true;
  unlocked.value = false;
};

const onPhotosChange = (urls: string[]) => {
  galleryPhotos.value = urls;
};
</script>

<template>
  <DreamBg :photo-urls="galleryPhotos" />
  <Transition name="gate-handoff">
    <GateView v-if="!unlocked" :reenter="reenter" @success="onSuccess" />
  </Transition>
  <Transition name="gallery-handoff">
    <GalleryView v-if="unlocked" @exit="onExit" @photos-change="onPhotosChange" />
  </Transition>
</template>

<style>
.gate-handoff-enter-active {
  position: fixed;
  inset: 0;
  z-index: 50;
  transition: opacity 0.5s ease;
}

.gate-handoff-enter-from {
  opacity: 0;
}

.gate-handoff-leave-active {
  position: fixed;
  inset: 0;
  z-index: 50;
  transition: opacity 0.45s ease;
  pointer-events: none;
}

.gate-handoff-leave-to {
  opacity: 0;
}

.gallery-handoff-leave-active {
  position: fixed;
  inset: 0;
  z-index: 40;
  transition: opacity 0.45s ease;
  pointer-events: none;
}

.gallery-handoff-leave-to {
  opacity: 0;
}
</style>
