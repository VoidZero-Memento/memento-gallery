<script setup lang="ts">
import { computed, onMounted } from 'vue'

import { LOADING_BANNER_URL } from '../utils/images'
import { CHROME_THEME, setChromeTheme } from '../utils/theme'

const props = defineProps<{
  done: number
  total: number
  /** resolve 完成后、进入收尾阶段（进度补到 100%） */
  arranging?: boolean
}>()

/** 预加载阶段封顶，留给收尾延迟补满，避免进度条到 100% 却还在等 */
const LOAD_CAP = 90

const percent = computed(() => {
  if (props.arranging) return 100
  if (props.total <= 0) return 0
  return Math.min(LOAD_CAP, Math.round((props.done / props.total) * LOAD_CAP))
})

const label = computed(() => {
  if (props.arranging) return '记忆已就绪，正在展开…'
  if (props.total <= 0) return '正在整理记忆…'
  if (props.done >= props.total) return '即将展开画廊…'
  return `正在唤起记忆 ${props.done} / ${props.total}`
})

onMounted(() => {
  setChromeTheme(CHROME_THEME.soft)
})
</script>

<template>
  <div class="loading" role="status" aria-live="polite" aria-busy="true">
    <div class="loading__stage">
      <img
        class="loading__banner"
        :src="LOADING_BANNER_URL"
        alt=""
        decoding="async"
        fetchpriority="high"
      />
      <div class="loading__veil" aria-hidden="true" />
      <div class="loading__panel">
        <p class="loading__eyebrow">Memento Gallery</p>
        <p class="loading__title">软糖星河</p>
        <p class="loading__label">{{ label }}</p>
        <div class="loading__track" aria-hidden="true">
          <span
            class="loading__fill"
            :class="{ 'loading__fill--finish': arranging }"
            :style="{ width: `${percent}%` }"
          />
        </div>
        <p class="loading__percent">{{ percent }}%</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading {
  position: fixed;
  inset: 0;
  z-index: 40;
  min-height: 100svh;
  min-height: 100dvh;
  background-color: #ffffff;
}

.loading__stage {
  position: absolute;
  inset: 0;
  overflow: hidden;
  animation: loading-rise 0.8s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.loading__banner {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 28%;
  transform: scale(1.06);
  opacity: 0.55;
  animation: loading-drift 12s ease-in-out infinite alternate;
}

.loading__veil {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.55) 0%,
      rgba(255, 248, 252, 0.35) 32%,
      rgba(255, 255, 255, 0.92) 72%,
      #ffffff 100%
    ),
    radial-gradient(ellipse at 50% 18%, rgba(255, 180, 200, 0.28), transparent 55%);
  pointer-events: none;
}

.loading__panel {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding:
    max(40px, 8svh)
    24px
    max(36px, calc(6svh + env(safe-area-inset-bottom, 0px)));
  text-align: center;
  color: var(--ink);
}

.loading__eyebrow {
  margin: 0;
  font-family: var(--font-display);
  letter-spacing: 0.22em;
  text-transform: uppercase;
  font-size: 0.72rem;
  color: var(--accent-teal);
}

.loading__title {
  margin: 10px 0 0;
  font-family: var(--font-display);
  font-size: clamp(2.4rem, 8vw, 3.4rem);
  font-weight: 400;
  letter-spacing: 0.1em;
  background: linear-gradient(120deg, #ff7e9d 0%, #c99bff 42%, #5ebfd4 88%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 6px 18px rgba(255, 140, 180, 0.28));
}

.loading__label {
  margin: 14px 0 0;
  font-size: 0.9rem;
  letter-spacing: 0.04em;
  color: var(--ink-soft);
}

.loading__track {
  position: relative;
  width: min(280px, 72%);
  height: 7px;
  margin: 18px auto 0;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 160, 180, 0.18);
  box-shadow: inset 0 1px 2px rgba(255, 140, 160, 0.12);
}

.loading__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #ff8fb0, #ffd0a8 52%, #7ad4e8);
  box-shadow: 0 0 12px rgba(255, 160, 190, 0.45);
  transition: width 0.35s ease;
}

.loading__fill--finish {
  transition: width 0.9s cubic-bezier(0.22, 1, 0.36, 1);
}

.loading__percent {
  margin: 10px 0 0;
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  color: var(--ink-soft);
}

@keyframes loading-rise {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes loading-drift {
  from {
    transform: scale(1.06) translateY(0);
  }
  to {
    transform: scale(1.12) translateY(-1.5%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .loading__stage,
  .loading__banner,
  .loading__fill {
    animation: none;
    transition: none;
  }
}
</style>
