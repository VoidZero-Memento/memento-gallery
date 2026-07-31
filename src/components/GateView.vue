<script setup lang="ts">
import { computed, ref } from "vue";

import { useGateStage } from "../composables/useGateStage";
import { resolveGatePayload, verifyGateKey } from "../utils/auth";
import { saveGateSession } from "../utils/session";
import GateAurora from "./gate/GateAurora.vue";
import GateForm from "./gate/GateForm.vue";
import GateStage from "./gate/GateStage.vue";

import type { GatePayload } from "../types/gallery.types";
import type { GateFieldError, GateFormModel } from "../types/gate.types";

const props = defineProps<{
  /** 从画廊离开后重挂载：先关门再完整 intro */
  reenter?: boolean;
}>();

const emit = defineEmits<{
  success: [payload: GatePayload];
}>();

const { phase, bannerReady, skipIntro, beginUnlock } = useGateStage({
  reenter: props.reenter,
});

const auroraRef = ref<{ burst: (x: number, y: number) => void } | null>(null);
const submitting = ref(false);
const shaking = ref(false);
const error = ref<GateFieldError | null>(null);
let pending: GatePayload | null = null;

const showBrand = computed(
  () => phase.value === "intro" || phase.value === "form",
);
const showForm = computed(
  () => phase.value === "form" || phase.value === "unlocking",
);
const locked = computed(
  () =>
    phase.value === "closing" ||
    phase.value === "unlocking" ||
    phase.value === "done",
);
const panelOut = computed(() => locked.value);

const fail = (message: string, field: GateFieldError["field"] = null) => {
  error.value = { field, message };
  shaking.value = true;
  window.setTimeout(() => {
    shaking.value = false;
  }, 480);
};

const onSubmit = async (model: GateFormModel) => {
  error.value = null;
  if (!model.secret.trim()) return fail("请填写访问密钥", "secret");

  submitting.value = true;
  try {
    const ok = await verifyGateKey(model.secret);
    if (!ok) {
      fail("密钥不对，请重新输入", "secret");
      return;
    }
    pending = resolveGatePayload();
    saveGateSession(pending);
    auroraRef.value?.burst(window.innerWidth / 2, window.innerHeight * 0.42);
    beginUnlock(() => {
      if (pending) emit("success", pending);
    });
  } catch {
    fail("密钥校验失败，请刷新后重试", "secret");
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <section
    class="gate"
    :class="[`gate--${phase}`, { 'gate--shake': shaking }]"
    @click="skipIntro"
  >
    <GateStage :phase="phase" :banner-ready="bannerReady" />
    <GateAurora ref="auroraRef" :phase="phase" />

    <div class="gate__panel" :class="{ 'gate__panel--out': panelOut }">
      <div v-show="showBrand" class="gate__brand">
        <p class="gate__eyebrow">Memento</p>
        <h1 class="gate__title">记忆之门</h1>
      </div>

      <div
        v-show="showForm"
        class="gate__entry"
        :class="{ 'gate__entry--shake': shaking }"
        @click.stop
      >
        <GateForm
          :locked="locked"
          :submitting="submitting"
          :error="error"
          @submit="onSubmit"
          @dismiss="error = null"
        />
      </div>
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
  place-items: stretch;
  padding: max(28px, env(safe-area-inset-top, 0px)) 18px
    max(28px, env(safe-area-inset-bottom, 0px));
  overflow: hidden;
}

.gate__panel {
  position: relative;
  z-index: 2;
  width: min(520px, 100%);
  margin-inline: auto;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition:
    opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1),
    filter 0.5s ease,
    transform 0.65s cubic-bezier(0.4, 0, 0.2, 1);
}

.gate__panel--out {
  opacity: 0;
  filter: blur(14px);
  transform: translateY(-12px) scale(1.03);
  pointer-events: none;
}

.gate__brand {
  margin-top: clamp(12vh, 22vh, 28vh);
  text-align: center;
  pointer-events: none;
  animation: brand-in 1.1s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.gate__eyebrow {
  margin: 0;
  font-family: var(--font-display);
  font-size: 0.95rem;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.95);
  text-shadow:
    0 1px 0 rgba(255, 255, 255, 0.5),
    0 4px 18px rgba(255, 126, 157, 0.45);
}

.gate__title {
  margin: 12px 0 0;
  font-family: var(--font-display);
  font-size: clamp(2.8rem, 10vw, 4rem);
  font-weight: 400;
  letter-spacing: 0.12em;
  background: linear-gradient(120deg, #ff6b8a 0%, #ff9a6b 45%, #5ec4d8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 8px 22px rgba(255, 140, 180, 0.35));
}

.gate__entry {
  margin-top: auto;
  margin-bottom: clamp(28px, 7vh, 56px);
  width: 100%;
  display: flex;
  justify-content: center;
}

.gate__entry--shake {
  animation: shake 0.48s ease;
}

@keyframes brand-in {
  from {
    opacity: 0;
    translate: 0 18px;
    scale: 0.96;
  }
  to {
    opacity: 1;
    translate: 0 0;
    scale: 1;
  }
}

@keyframes shake {
  0%,
  100% {
    translate: 0;
  }
  20% {
    translate: -6px;
  }
  40% {
    translate: 5px;
  }
  60% {
    translate: -3px;
  }
  80% {
    translate: 2px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .gate__brand,
  .gate__panel,
  .gate__entry--shake {
    animation: none !important;
    transition: none;
  }

  .gate__panel--out {
    opacity: 0;
    filter: none;
    transform: none;
  }
}
</style>
