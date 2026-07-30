<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

import DreamBg from './components/DreamBg.vue'
import GalleryView from './components/GalleryView.vue'
import GateView from './components/GateView.vue'
import { clearGateSession, loadGateSession } from './utils/session'
import { CHROME_THEME, setChromeTheme } from './utils/theme'

import type { GatePayload } from './types/gallery.types'

const payload = ref<GatePayload | null>(null)

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
  payload.value = next
}

const onExit = () => {
  clearGateSession()
  payload.value = null
}
</script>

<template>
  <DreamBg />
  <GateView v-if="!payload" @success="onSuccess" />
  <GalleryView v-else :payload="payload" @exit="onExit" />
</template>
