import type { GatePhase } from "../../types/gate.types";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ox: number;
  oy: number;
  r: number;
  seed: number;
  hue: number;
  sat: number;
  alpha: number;
  twinkle: number;
  twinkleSpeed: number;
  swayAmp: number;
  swayFreq: number;
};

type Ripple = {
  active: boolean;
  x: number;
  y: number;
  t: number;
  life: number;
  radius: number;
  width: number;
  hue: number;
  strength: number;
  seed: number;
};

export type AuroraState = {
  width: number;
  height: number;
  diag: number;
  dpr: number;
  time: number;
  count: number;
  particles: Particle[];
  ripples: Ripple[];
  ribbons: ReturnType<typeof createRibbon>[];
  pointerX: number;
  pointerY: number;
  pointerTargetX: number;
  pointerTargetY: number;
  pointerActive: boolean;
  intensity: number;
  targetIntensity: number;
  bloom: number;
  targetBloom: number;
  unlockT: number;
};

/** 玫红 / 蜜桃 / 青蓝 / 淡紫，[色相, 饱和度] */
const PALETTE: ReadonlyArray<readonly [number, number]> = [
  [344, 100],
  [22, 100],
  [191, 68],
  [272, 94],
];
const MAX_PARTICLES = 140;
const MAX_RIPPLES = 14;
const SPARKS_PER_RIPPLE = 16;
const POINTER_RADIUS = 190;
const EDGE_MARGIN = 48;
const TAU = Math.PI * 2;
const GOLDEN_ANGLE = 2.399963229728653;

export const PHASE_TUNING: Record<
  GatePhase,
  { intensity: number; bloom: number }
> = {
  booting: { intensity: 0.25, bloom: 0 },
  intro: { intensity: 1, bloom: 0.34 },
  form: { intensity: 0.75, bloom: 0.08 },
  closing: { intensity: 1.15, bloom: 0.9 },
  unlocking: { intensity: 1.3, bloom: 1 },
  done: { intensity: 0, bloom: 0 },
};

const clamp = (v: number, min: number, max: number) =>
  v < min ? min : v > max ? max : v;
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const pickHue = () => PALETTE[(Math.random() * PALETTE.length) | 0];

const resetParticle = (p: Particle, w: number, h: number) => {
  const [hue, sat] = pickHue();
  p.x = rand(-EDGE_MARGIN, w + EDGE_MARGIN);
  p.y = rand(-EDGE_MARGIN, h + EDGE_MARGIN);
  p.vx = rand(-6, 6);
  p.vy = rand(-24, -7);
  p.ox = 0;
  p.oy = 0;
  p.r = rand(3.2, 11);
  p.seed = rand(0, TAU);
  p.hue = hue + rand(-9, 9);
  p.sat = sat + rand(-8, 4);
  p.alpha = rand(0.35, 0.85);
  p.twinkle = rand(0, TAU);
  p.twinkleSpeed = rand(0.5, 1.7);
  p.swayAmp = rand(4, 15);
  p.swayFreq = rand(0.16, 0.52);
  return p;
};

const createRibbon = (index: number) => ({
  y: index === 0 ? 0.3 : 0.72,
  amp: rand(0.05, 0.1),
  waves: rand(1.6, 2.6),
  speed: rand(0.06, 0.13) * (index === 0 ? 1 : -1),
  phase: rand(0, TAU),
  hue: index === 0 ? 344 : 268,
  thickness: rand(150, 230),
});

const createRipple = (): Ripple => ({
  active: false,
  x: 0,
  y: 0,
  t: 0,
  life: 1,
  radius: 1,
  width: 1,
  hue: 344,
  strength: 1,
  seed: 0,
});

export const createAuroraState = (): AuroraState => ({
  width: 0,
  height: 0,
  diag: 1,
  dpr: 1,
  time: 0,
  count: 0,
  particles: Array.from({ length: MAX_PARTICLES }, () =>
    resetParticle({} as Particle, 1, 1),
  ),
  ripples: Array.from({ length: MAX_RIPPLES }, createRipple),
  ribbons: [createRibbon(0), createRibbon(1)],
  pointerX: 0,
  pointerY: 0,
  pointerTargetX: 0,
  pointerTargetY: 0,
  pointerActive: false,
  intensity: 0,
  targetIntensity: 0,
  bloom: 0,
  targetBloom: 0,
  unlockT: -1,
});

export const resizeAurora = (
  s: AuroraState,
  w: number,
  h: number,
  dpr: number,
) => {
  const scaleX = s.width > 0 ? w / s.width : 0;
  const scaleY = s.height > 0 ? h / s.height : 0;
  for (let i = 0; i < MAX_PARTICLES; i += 1) {
    const p = s.particles[i];
    // 在用的粒子按比例平移，避免尺寸变化时整片跳变；未启用的槽位才重新播撒
    if (scaleX > 0 && i < s.count) {
      p.x *= scaleX;
      p.y *= scaleY;
    } else {
      resetParticle(p, w, h);
    }
  }
  s.width = w;
  s.height = h;
  s.dpr = dpr;
  s.diag = Math.hypot(w, h) || 1;
  s.count = Math.round(clamp((w * h) / 14000, 40, 130));
  if (!s.pointerActive) {
    s.pointerX = w / 2;
    s.pointerY = h / 2;
    s.pointerTargetX = s.pointerX;
    s.pointerTargetY = s.pointerY;
  }
};

export const spawnRipple = (
  s: AuroraState,
  x: number,
  y: number,
  strength: number,
) => {
  let slot = s.ripples[0];
  for (const r of s.ripples) {
    // 优先用空闲槽位，池满时回收进度最靠后的那圈
    if (!r.active) {
      slot = r;
      break;
    }
    if (slot.active && r.t / r.life > slot.t / slot.life) slot = r;
  }
  slot.active = true;
  slot.x = x;
  slot.y = y;
  slot.t = 0;
  slot.life = 780 + strength * 340;
  slot.radius = (110 + strength * 180) * clamp(s.diag / 1400, 0.7, 1.6);
  slot.width = 1.6 + strength * 2.2;
  slot.hue = pickHue()[0] + rand(-8, 8);
  slot.strength = strength;
  slot.seed = rand(0, TAU);
};

export const startUnlock = (s: AuroraState) => {
  s.unlockT = 0;
  spawnRipple(s, s.width / 2, s.height / 2, 1.6);
};

/** 返回本帧径向力（负=向心聚拢，正=爆散），构成 unlocking 的高潮时间线 */
const updateUnlock = (s: AuroraState, dt: number) => {
  if (s.unlockT < 0) return 0;
  s.unlockT += dt;
  if (s.unlockT > 1100) {
    s.unlockT = -1;
    return 0;
  }
  if (s.unlockT < 300) return -460 * (s.unlockT / 300);
  const k = clamp((s.unlockT - 300) / 800, 0, 1);
  return 980 * (1 - k) * (1 - k);
};

const wrap = (s: AuroraState, p: Particle) => {
  const m = EDGE_MARGIN + p.r;
  if (p.y < -m) {
    p.y = s.height + m;
    p.x = rand(-EDGE_MARGIN, s.width + EDGE_MARGIN);
  } else if (p.y > s.height + m) p.y = -m;
  if (p.x < -m) p.x = s.width + m;
  else if (p.x > s.width + m) p.x = -m;
};

const updateParticles = (s: AuroraState, dts: number, radial: number) => {
  const cx = s.width / 2;
  const cy = s.height / 2;
  const life = 0.16 + s.intensity * 0.9;
  const ease = clamp(dts * 2.6, 0, 1);
  for (let i = 0; i < s.count; i += 1) {
    const p = s.particles[i];
    const sway =
      Math.sin(s.time * p.swayFreq + p.seed) * p.swayAmp +
      Math.sin(s.time * p.swayFreq * 0.47 + p.seed * 1.9) * p.swayAmp * 0.45;
    p.x += (p.vx + sway) * life * dts;
    p.y += p.vy * life * dts;
    if (radial !== 0) {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const d = Math.hypot(dx, dy) || 1;
      const f = radial * (0.45 + (d / (s.diag * 0.5)) * 0.55) * dts;
      p.x += (dx / d) * f;
      p.y += (dy / d) * f;
    }
    let tox = 0;
    let toy = 0;
    if (s.pointerActive) {
      const dx = s.pointerX - p.x;
      const dy = s.pointerY - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 0.01 && d < POINTER_RADIUS) {
        const f = (1 - d / POINTER_RADIUS) ** 2;
        tox = (dx * 0.3 - dy * 0.24) * f;
        toy = (dy * 0.3 + dx * 0.24) * f;
      }
    }
    p.ox = lerp(p.ox, tox, ease);
    p.oy = lerp(p.oy, toy, ease);
    p.twinkle += p.twinkleSpeed * dts;
    wrap(s, p);
  }
};

export const updateAurora = (s: AuroraState, dt: number) => {
  const dts = dt / 1000;
  s.time += dts;
  const ease = clamp(dts * 2.4, 0, 1);
  const follow = clamp(dts * 6, 0, 1);
  s.intensity = lerp(s.intensity, s.targetIntensity, ease);
  s.bloom = lerp(s.bloom, s.targetBloom, ease);
  s.pointerX = lerp(s.pointerX, s.pointerTargetX, follow);
  s.pointerY = lerp(s.pointerY, s.pointerTargetY, follow);
  updateParticles(s, dts, updateUnlock(s, dt));
  for (const r of s.ripples) {
    if (!r.active) continue;
    r.t += dt;
    if (r.t >= r.life) r.active = false;
  }
};

const drawRibbons = (ctx: CanvasRenderingContext2D, s: AuroraState) => {
  const alpha = 0.05 * s.intensity + s.bloom * 0.035;
  if (alpha < 0.004) return;
  for (const rb of s.ribbons) {
    const span = s.width + rb.thickness * 2;
    for (let i = 0; i <= 12; i += 1) {
      const t = i / 12;
      const x = t * span - rb.thickness;
      const y =
        s.height * rb.y +
        Math.sin(t * rb.waves * TAU + s.time * rb.speed * TAU + rb.phase) *
          rb.amp *
          s.height;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rb.thickness);
      g.addColorStop(0, `hsla(${rb.hue}, 100%, 70%, ${alpha})`);
      g.addColorStop(0.55, `hsla(${rb.hue}, 100%, 74%, ${alpha * 0.42})`);
      g.addColorStop(1, `hsla(${rb.hue}, 100%, 78%, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(
        x - rb.thickness,
        y - rb.thickness,
        rb.thickness * 2,
        rb.thickness * 2,
      );
    }
  }
};

const drawParticles = (ctx: CanvasRenderingContext2D, s: AuroraState) => {
  const bloom = s.bloom;
  // 白底上加法混合会把画面洗成灰白，光晕改用 multiply：重叠处颜色更浓而不是发白
  ctx.globalCompositeOperation = "multiply";
  for (let i = 0; i < s.count; i += 1) {
    const p = s.particles[i];
    const a = clamp(
      p.alpha *
        (0.55 + 0.45 * Math.sin(p.twinkle)) *
        s.intensity *
        (0.36 + bloom * 0.34),
      0,
      0.62,
    );
    if (a < 0.004) continue;
    const x = p.x + p.ox;
    const y = p.y + p.oy;
    const r = p.r * (1 + bloom * 0.5);
    const sat = clamp(p.sat + bloom * 12, 0, 100);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `hsla(${p.hue}, ${sat}%, ${62 - bloom * 6}%, ${a})`);
    g.addColorStop(0.42, `hsla(${p.hue}, ${sat}%, 70%, ${a * 0.45})`);
    g.addColorStop(1, `hsla(${p.hue}, ${sat}%, 80%, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // 高亮芯用 source-over 叠在被 multiply 压深的晕心上，读起来才是「发光的微粒」
  ctx.globalCompositeOperation = "source-over";
  for (let i = 0; i < s.count; i += 1) {
    const p = s.particles[i];
    const a = clamp(
      p.alpha *
        (0.55 + 0.45 * Math.sin(p.twinkle)) *
        s.intensity *
        (0.7 + bloom * 0.3),
      0,
      0.95,
    );
    if (a < 0.01) continue;
    ctx.fillStyle = `hsla(${p.hue}, 100%, ${68 + bloom * 6}%, ${a})`;
    ctx.beginPath();
    ctx.arc(
      p.x + p.ox,
      p.y + p.oy,
      Math.max(0.5, p.r * 0.26 * (1 + bloom * 0.6)),
      0,
      TAU,
    );
    ctx.fill();
  }
};

const drawRipples = (ctx: CanvasRenderingContext2D, s: AuroraState) => {
  for (const r of s.ripples) {
    if (!r.active) continue;
    const t = r.t / r.life;
    const radius = Math.max(1, r.radius * (1 - (1 - t) ** 3));
    const fade = (1 - t) ** 2 * clamp(s.intensity, 0, 1);
    if (fade < 0.004) continue;
    ctx.strokeStyle = `hsla(${r.hue}, 100%, 64%, ${0.46 * fade * r.strength})`;
    ctx.lineWidth = Math.max(0.6, r.width * (1 - t));
    ctx.beginPath();
    ctx.arc(r.x, r.y, radius, 0, TAU);
    ctx.stroke();
    const g = ctx.createRadialGradient(
      r.x,
      r.y,
      radius * 0.25,
      r.x,
      r.y,
      radius,
    );
    g.addColorStop(0, `hsla(${r.hue}, 100%, 76%, 0)`);
    g.addColorStop(
      0.85,
      `hsla(${r.hue}, 100%, 68%, ${0.14 * fade * r.strength})`,
    );
    g.addColorStop(1, `hsla(${r.hue}, 100%, 74%, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(r.x, r.y, radius, 0, TAU);
    ctx.fill();
    for (let i = 0; i < SPARKS_PER_RIPPLE; i += 1) {
      // 火花参数由 seed 推导，避免每次 burst 都分配新数组
      const angle = r.seed + i * GOLDEN_ANGLE;
      const d = radius * (0.58 + ((i * 37) % 100) / 220);
      ctx.fillStyle = `hsla(${r.hue + ((i * 29) % 44) - 22}, 100%, 62%, ${0.7 * fade})`;
      ctx.beginPath();
      ctx.arc(
        r.x + Math.cos(angle) * d,
        r.y + Math.sin(angle) * d,
        Math.max(0.5, (2.6 - t * 1.8) * r.strength),
        0,
        TAU,
      );
      ctx.fill();
    }
  }
};

export const clearAurora = (ctx: CanvasRenderingContext2D, s: AuroraState) => {
  ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
  ctx.clearRect(0, 0, s.width, s.height);
};

export const drawAurora = (ctx: CanvasRenderingContext2D, s: AuroraState) => {
  clearAurora(ctx, s);
  if (s.intensity < 0.004) return;
  drawRibbons(ctx, s);
  drawParticles(ctx, s);
  drawRipples(ctx, s);
  ctx.globalCompositeOperation = "source-over";
};

export const drawStaticAurora = (
  ctx: CanvasRenderingContext2D,
  s: AuroraState,
) => {
  clearAurora(ctx, s);
  const r = Math.min(s.width, s.height) * 0.24;
  for (let i = 0; i < 5; i += 1) {
    const [hue] = PALETTE[i % PALETTE.length];
    const x = s.width * (0.16 + 0.17 * i);
    const y = s.height * (i % 2 === 0 ? 0.28 : 0.68);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `hsla(${hue}, 100%, 72%, 0.1)`);
    g.addColorStop(1, `hsla(${hue}, 100%, 78%, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
};
