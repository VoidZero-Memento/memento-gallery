<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

import DreamBg from './components/DreamBg.vue'
import GalleryView from './components/GalleryView.vue'
import GateView from './components/GateView.vue'
import { clearGateSession, loadGateSession } from './utils/session'
import { CHROME_THEME, setChromeTheme } from './utils/theme'

import type { GatePayload } from './types/gallery.types'

const payload = ref<GatePayload | null>(null)
const reenter = ref(false)

onMounted(() => {
  payload.value = loadGateSession()
})

watch(
  payload,
  (v) => {
    if (!v) setChromeTheme(CHROME_THEME.soft)
  },
  { immediate: true },
)

const onSuccess = (next: GatePayload) => {
  reenter.value = false
  payload.value = next
}

const onExit = () => {
  clearGateSession()
  reenter.value = true
  payload.value = null
}
</script>

<template>
  <DreamBg />
  <Transition name="gate-handoff">
    <GateView v-if="!payload" :reenter="reenter" @success="onSuccess" />
  </Transition>
  <Transition name="gallery-handoff">
    <GalleryView v-if="payload" :payload="payload" @exit="onExit" />
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
