import type { LightboxOriginRect } from "../types/lightbox.types";

const HORIZONTAL_PADDING = 40;
const CAPTION_SPACE = 58;

export const readOriginRect = (el: Element): LightboxOriginRect => {
  const { top, left, width, height } = el.getBoundingClientRect();
  return { top, left, width, height };
};

export const computeTargetRect = (
  naturalWidth: number,
  naturalHeight: number,
): LightboxOriginRect => {
  const maxWidth = Math.max(1, Math.min(920, window.innerWidth - HORIZONTAL_PADDING));
  const maxHeight = Math.max(1, window.innerHeight * 0.78 - CAPTION_SPACE);
  const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight, 1);
  const width = Math.max(1, naturalWidth * scale);
  const height = Math.max(1, naturalHeight * scale);

  return {
    top: Math.max(20, (window.innerHeight - CAPTION_SPACE - height) / 2),
    left: (window.innerWidth - width) / 2,
    width,
    height,
  };
};
