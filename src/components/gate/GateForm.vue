<script setup lang="ts">
import { computed, reactive } from "vue";

import type { GateFieldError, GateFormModel } from "../../types/gate.types";

const props = defineProps<{
  locked: boolean;
  submitting: boolean;
  error: GateFieldError | null;
}>();

const emit = defineEmits<{
  submit: [GateFormModel];
  dismiss: [];
}>();

const model = reactive<GateFormModel>({
  secret: "",
});

const ready = computed(() => model.secret.trim().length > 0);
const tip = computed(() =>
  props.error?.field === "secret" || (props.error && !props.error.field)
    ? props.error.message
    : "",
);

const onInput = () => {
  if (props.error) emit("dismiss");
};

const onSubmit = () => {
  if (props.locked || props.submitting) return;
  emit("submit", { ...model });
};
</script>

<template>
  <form
    class="form"
    :class="{ 'form--live': !locked, 'form--bad': !!tip, 'form--ready': ready }"
    @submit.prevent="onSubmit"
  >
    <label class="field">
      <input
        v-model="model.secret"
        class="field__input"
        type="password"
        autocomplete="current-password"
        spellcheck="false"
        aria-label="访问密钥"
        placeholder="访问密钥"
        @input="onInput"
      />
      <span class="field__line" aria-hidden="true" />
      <span class="field__glow" aria-hidden="true" />
    </label>

    <span class="form__tipbox" :class="{ 'form__tipbox--open': !!tip }">
      <span class="form__tip" role="alert">{{ tip }}</span>
    </span>

    <button
      class="submit"
      type="submit"
      :disabled="locked || submitting"
    >
      <span v-if="submitting" class="submit__spinner" aria-hidden="true" />
      {{ submitting ? "正在核对…" : "推开大门" }}
    </button>
  </form>
</template>

<style scoped>
.form {
  width: min(240px, 78vw);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  opacity: 0;
  translate: 0 10px;
}

.form--live {
  animation: form-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) 160ms forwards;
}

.field {
  position: relative;
  display: block;
  width: 100%;
}

.field__input {
  width: 100%;
  box-sizing: border-box;
  border: none;
  border-radius: 0;
  padding: 10px 4px 12px;
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.28em;
  text-align: center;
  color: #fff;
  text-shadow: 0 1px 12px rgba(20, 8, 30, 0.55);
  background: transparent;
  outline: none;
  -webkit-text-size-adjust: 100%;
}

.field__input::placeholder {
  letter-spacing: 0.32em;
  color: rgba(255, 255, 255, 0.62);
  text-shadow: 0 1px 10px rgba(20, 8, 30, 0.5);
  opacity: 1;
  transition: color 0.28s, opacity 0.28s;
}

.field__input:focus::placeholder {
  color: rgba(255, 255, 255, 0.32);
}

.field__line {
  position: absolute;
  left: 18%;
  right: 18%;
  bottom: 0;
  height: 1px;
  background: rgba(255, 255, 255, 0.38);
  pointer-events: none;
  transition: left 0.35s, right 0.35s, background 0.3s;
}

.field__glow {
  position: absolute;
  left: 12%;
  right: 12%;
  bottom: 0;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, transparent, #ffc2a8 28%, #ff7e9d 50%, #9ad8e8 72%, transparent);
  transform: scaleX(0);
  opacity: 0;
  transform-origin: center;
  pointer-events: none;
  transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.28s;
  box-shadow: 0 0 12px rgba(255, 150, 185, 0.45);
}

.field:focus-within .field__line {
  left: 8%;
  right: 8%;
  background: rgba(255, 255, 255, 0.12);
}

.field:focus-within .field__glow {
  transform: scaleX(1);
  opacity: 1;
}

.form--bad .field__line {
  left: 8%;
  right: 8%;
  background: rgba(255, 120, 150, 0.55);
}

.form--bad .field__glow {
  transform: scaleX(1);
  opacity: 1;
  background: linear-gradient(90deg, transparent, #ff8fa8 30%, #e04868 50%, #ff9a6b 70%, transparent);
}

.form--bad .field {
  animation: field-nudge 0.42s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}

.form__tipbox {
  display: grid;
  width: 100%;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.form__tipbox--open {
  grid-template-rows: 1fr;
}

.form__tip {
  overflow: hidden;
  min-height: 0;
  text-align: center;
  color: #ffe0e8;
  text-shadow: 0 1px 8px rgba(40, 6, 20, 0.65);
  font-size: 0.8rem;
  line-height: 1.45;
  opacity: 0;
  transition: opacity 0.28s 0.06s;
}

.form__tipbox--open .form__tip {
  opacity: 1;
}

.submit {
  margin-top: 6px;
  padding: 8px 12px;
  font: inherit;
  font-size: 0.95rem;
  font-weight: 500;
  letter-spacing: 0.28em;
  color: rgba(255, 255, 255, 0.72);
  text-shadow: 0 1px 12px rgba(20, 8, 30, 0.45);
  cursor: pointer;
  background: transparent;
  border: none;
  transition: color 0.3s, text-shadow 0.3s, letter-spacing 0.35s, transform 0.28s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.form--ready .submit {
  color: #fff;
  letter-spacing: 0.34em;
  text-shadow:
    0 1px 0 rgba(255, 255, 255, 0.35),
    0 4px 18px rgba(255, 126, 157, 0.55);
}

.submit:hover:not(:disabled) {
  color: #fff;
  transform: translateY(-1px);
  text-shadow:
    0 1px 0 rgba(255, 255, 255, 0.4),
    0 6px 22px rgba(255, 140, 180, 0.65);
}

.submit:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}

.submit:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.submit__spinner {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  animation: spin 0.7s linear infinite;
}

@keyframes form-in {
  to {
    opacity: 1;
    translate: 0 0;
  }
}

@keyframes field-nudge {
  0%,
  100% {
    translate: 0;
  }
  22% {
    translate: -5px;
  }
  46% {
    translate: 4px;
  }
  70% {
    translate: -2px;
  }
  88% {
    translate: 1px;
  }
}

@keyframes spin {
  to {
    rotate: 360deg;
  }
}

@media (prefers-reduced-motion: reduce) {
  .form {
    opacity: 1;
    translate: 0;
    animation: none !important;
  }

  .field__glow,
  .form--bad .field {
    animation: none;
    transition: none;
  }

  .field:focus-within .field__glow {
    transform: scaleX(1);
    opacity: 1;
  }
}
</style>
