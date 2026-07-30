<script setup lang="ts">
import { ref } from "vue";

import { verifyGateKey } from "../utils/auth";
import { parseExcludeList } from "../utils/images";
import { saveGateSession } from "../utils/session";

import type { GatePayload } from "../types/gallery.types";

const emit = defineEmits<{
  success: [payload: GatePayload];
}>();

const spaceName = ref("");
const count = ref("");
const excludes = ref("");
const secret = ref("");
const error = ref("");
const secretError = ref(false);
const shaking = ref(false);
const submitting = ref(false);
const unlocked = ref(false);
const spot = ref({ x: 50, y: 40 });

const onCardMove = (e: MouseEvent) => {
  const el = e.currentTarget as HTMLElement;
  const rect = el.getBoundingClientRect();
  spot.value = {
    x: ((e.clientX - rect.left) / rect.width) * 100,
    y: ((e.clientY - rect.top) / rect.height) * 100,
  };
};

const shake = () => {
  shaking.value = true;
  window.setTimeout(() => {
    shaking.value = false;
  }, 520);
};

const fail = (message: string, isSecret = false) => {
  error.value = message;
  secretError.value = isSecret;
  shake();
};

const onSubmit = async () => {
  error.value = "";
  secretError.value = false;
  const name = spaceName.value.trim();
  const n = Number(count.value);

  if (!name) {
    fail("请填写相册代号");
    return;
  }
  if (!Number.isInteger(n) || n < 1 || n > 500) {
    fail("图片数量请填写 1–500 的整数");
    return;
  }
  if (!secret.value.trim()) {
    fail("请填写访问密钥", true);
    return;
  }

  submitting.value = true;
  try {
    const ok = await verifyGateKey(secret.value);
    if (!ok) {
      fail("密钥不对，请重新输入", true);
      return;
    }

    const payload: GatePayload = {
      spaceName: name,
      count: n,
      excludes: parseExcludeList(excludes.value),
    };
    saveGateSession(payload);
    unlocked.value = true;
    window.setTimeout(() => emit("success", payload), 680);
  } catch {
    fail("密钥校验失败，请刷新后重试", true);
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <section class="gate" :class="{ 'gate--unlock': unlocked }">
    <div class="gate__glow" />
    <div
      class="gate__card"
      :class="{ 'gate__card--shake': shaking }"
      :style="{ '--spot-x': `${spot.x}%`, '--spot-y': `${spot.y}%` }"
      @mousemove="onCardMove"
    >
      <div class="gate__spot" />
      <p class="gate__eyebrow">Memento</p>
      <h1 class="gate__title">记忆之门</h1>
      <p class="gate__hint">输入约定信息，推开这扇柔软的门</p>

      <form class="gate__form" @submit.prevent="onSubmit">
        <label class="field">
          <span class="field__label">相册代号</span>
          <input
            v-model="spaceName"
            class="field__input"
            type="text"
            autocomplete="off"
            spellcheck="false"
            placeholder="请输入约定代号"
          />
        </label>

        <label class="field">
          <span class="field__label">图片数量</span>
          <input
            v-model="count"
            class="field__input"
            type="number"
            min="1"
            max="500"
            inputmode="numeric"
            placeholder="例如 50"
          />
        </label>

        <label class="field">
          <span class="field__label">排除序号 <em>可选</em></span>
          <input
            v-model="excludes"
            class="field__input"
            type="text"
            autocomplete="off"
            placeholder="例如 5,8,12"
          />
        </label>

        <label class="field">
          <span class="field__label">访问密钥</span>
          <input
            v-model="secret"
            class="field__input"
            :class="{ 'field__input--invalid': secretError }"
            type="text"
            autocomplete="off"
            spellcheck="false"
            placeholder="请输入密钥"
            @input="secretError = false"
          />
          <span v-if="secretError && error" class="field__tip" role="alert">{{
            error
          }}</span>
        </label>

        <p v-if="error && !secretError" class="gate__error" role="alert">
          {{ error }}
        </p>

        <button
          class="gate__btn"
          type="submit"
          :disabled="submitting || unlocked"
        >
          <span class="gate__btn-shine" />
          <span class="gate__btn-text">{{
            unlocked ? "正在开启…" : "推开大门"
          }}</span>
        </button>
      </form>
    </div>
  </section>
</template>

<style scoped>
.gate {
  position: relative;
  z-index: 1;
  min-height: 100svh;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: max(28px, env(safe-area-inset-top, 0px)) 18px
    max(40px, env(safe-area-inset-bottom, 0px));
}

.gate__glow {
  position: absolute;
  width: min(520px, 90vw);
  height: min(520px, 90vw);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 180, 200, 0.55),
    transparent 68%
  );
  filter: blur(8px);
  animation: pulse-glow 5s ease-in-out infinite;
  pointer-events: none;
}

.gate__card {
  --spot-x: 50%;
  --spot-y: 40%;
  position: relative;
  width: min(420px, 100%);
  padding: 36px 28px 30px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.75);
  box-shadow:
    0 20px 60px rgba(255, 150, 170, 0.18),
    0 8px 24px rgba(100, 180, 210, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(18px) saturate(1.2);
  animation: card-in 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
  overflow: hidden;
}

.gate__spot {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    320px circle at var(--spot-x) var(--spot-y),
    rgba(255, 200, 220, 0.45),
    transparent 55%
  );
  transition: background 0.15s ease;
  z-index: 0;
}

.gate__card > :not(.gate__spot) {
  position: relative;
  z-index: 1;
}

.gate__card--shake {
  animation: shake 0.5s ease;
}

.gate__eyebrow {
  margin: 0;
  font-family: var(--font-display);
  font-size: 0.95rem;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--accent-teal);
  text-align: center;
}

.gate__title {
  margin: 10px 0 0;
  font-family: var(--font-display);
  font-size: clamp(2.4rem, 8vw, 3.2rem);
  font-weight: 400;
  text-align: center;
  color: var(--ink);
  letter-spacing: 0.08em;
  background: linear-gradient(120deg, #ff6b8a 0%, #ff9a6b 45%, #5ec4d8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.gate__hint {
  margin: 12px 0 28px;
  text-align: center;
  color: var(--ink-soft);
  font-size: 0.95rem;
}

.gate__form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
}

.field__label {
  font-size: 0.82rem;
  color: var(--ink-soft);
  letter-spacing: 0.04em;
}

.field__label em {
  font-style: normal;
  opacity: 0.65;
  margin-left: 4px;
}

.field__input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(255, 160, 180, 0.35);
  border-radius: 14px;
  padding: 11px 14px;
  font-family: var(--font-body);
  font-size: 16px;
  font-weight: 500;
  line-height: 1.35;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.72);
  outline: none;
  -webkit-text-size-adjust: 100%;
  transition:
    border-color 0.25s,
    box-shadow 0.25s,
    transform 0.25s;
}

.field__input--invalid {
  border-color: rgba(224, 72, 104, 0.75);
  box-shadow: 0 0 0 3px rgba(224, 72, 104, 0.18);
}

.field__tip {
  margin: 2px 0 0;
  color: #e04868;
  font-size: 12px;
  line-height: 1.4;
  animation: fade-up 0.35s ease;
}

.field__input:focus {
  border-color: rgba(255, 120, 150, 0.7);
  box-shadow: 0 0 0 4px rgba(255, 160, 180, 0.22);
  transform: translateY(-1px);
}

.gate__error {
  margin: 0;
  color: #e04868;
  font-size: 0.88rem;
  text-align: center;
  animation: fade-up 0.35s ease;
}

.gate__btn {
  position: relative;
  margin-top: 8px;
  overflow: hidden;
  border: none;
  border-radius: 999px;
  padding: 14px 20px;
  font: inherit;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(120deg, #ff7e9d, #ffb07a 50%, #6ad0e2);
  background-size: 200% 200%;
  box-shadow: 0 12px 28px rgba(255, 120, 150, 0.35);
  transition:
    transform 0.25s,
    box-shadow 0.25s,
    filter 0.25s;
  animation: btn-shift 6s ease infinite;
}

.gate__btn:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 16px 36px rgba(255, 120, 150, 0.45);
}

.gate__btn:disabled {
  cursor: wait;
  filter: saturate(0.85);
}

.gate__btn-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    110deg,
    transparent 30%,
    rgba(255, 255, 255, 0.45) 50%,
    transparent 70%
  );
  transform: translateX(-120%);
  animation: shine 3.2s ease-in-out infinite;
}

.gate__btn-text {
  position: relative;
  z-index: 1;
}

.gate--unlock .gate__card {
  animation: unlock-out 0.7s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(28px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes unlock-out {
  to {
    opacity: 0;
    transform: translateY(-24px) scale(1.04);
    filter: blur(8px);
  }
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-8px);
  }
  40% {
    transform: translateX(8px);
  }
  60% {
    transform: translateX(-5px);
  }
  80% {
    transform: translateX(5px);
  }
}

@keyframes pulse-glow {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.08);
    opacity: 1;
  }
}

@keyframes shine {
  0%,
  60% {
    transform: translateX(-120%);
  }
  100% {
    transform: translateX(120%);
  }
}

@keyframes btn-shift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .gate__card,
  .gate__glow,
  .gate__btn,
  .gate__btn-shine {
    animation: none;
  }
}
</style>
