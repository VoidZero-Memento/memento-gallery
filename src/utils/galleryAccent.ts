import type { GalleryAccent } from "../types/galleryAccent.types";

/** 粉嫩氛围色相带：粉玫 / 桃橙 / 奶油黄 / 薄荷绿 / 淡紫（避开深蓝、墨绿、深褐） */
const PASTEL_HUE_BANDS: ReadonlyArray<readonly [number, number]> = [
  [330, 360], // 粉玫上段
  [0, 22], // 粉玫下段 + 珊瑚
  [22, 48], // 桃橙
  [48, 68], // 奶油黄
  [140, 172], // 薄荷绿
  [275, 318], // 淡紫 / 丁香
];

/** 确定性混洗，同 id 永远同色 */
const hash = (n: number): number => {
  let x = (n + 1) * 2654435761;
  x ^= x >>> 16;
  x = Math.imul(x, 2246822519);
  x ^= x >>> 13;
  x = Math.imul(x, 3266489917);
  x ^= x >>> 16;
  return x >>> 0;
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const pastelHueOf = (h: number): number => {
  const totalSpan = PASTEL_HUE_BANDS.reduce((sum, [lo, hi]) => sum + (hi - lo), 0);
  let cursor = h % totalSpan;
  for (const [lo, hi] of PASTEL_HUE_BANDS) {
    const span = hi - lo;
    if (cursor < span) return lo + cursor;
    cursor -= span;
  }
  return PASTEL_HUE_BANDS[0][0];
};

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  const sat = clamp(s, 0, 1);
  const light = clamp(l, 0, 1);
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = light - c / 2;
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
};

const toHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;

const toRgba = (r: number, g: number, b: number, a: number) => `rgba(${r}, ${g}, ${b}, ${a})`;

export const galleryAccentOf = (id: number): GalleryAccent => {
  const h = hash(id);
  const hue = pastelHueOf(h);
  // 粉嫩粉彩：偏低饱和 + 偏高明度，避免沉色
  const sat = 0.36 + ((h >>> 8) % 22) / 100;
  const solidL = 0.74 + ((h >>> 16) % 10) / 100;
  const softL = clamp(solidL + 0.14, 0.88, 0.95);
  const deepL = clamp(solidL - 0.12, 0.58, 0.68);

  const [sr, sg, sb] = hslToRgb(hue, sat, solidL);
  const [fr, fg, fb] = hslToRgb(hue, sat * 0.78, softL);
  const [dr, dg, db] = hslToRgb(hue, clamp(sat + 0.06, 0, 0.62), deepL);
  const accentA = 0.58 + ((h >>> 24) % 8) / 100;
  const glowA = accentA - 0.22;

  return {
    accent: toRgba(sr, sg, sb, accentA),
    glow: toRgba(sr, sg, sb, glowA),
    solid: toHex(sr, sg, sb),
    soft: toHex(fr, fg, fb),
    deep: toHex(dr, dg, db),
  };
};
