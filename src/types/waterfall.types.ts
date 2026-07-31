import type { GalleryImage } from "./gallery.types";

export type WaterfallBreakpoints = Record<number, { rowPerView: number }>;

export type WaterfallLayoutItem = {
  index: number;
  item: GalleryImage;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type WaterfallLayout = {
  cols: number;
  colWidth: number;
  offsetX: number;
  height: number;
  items: WaterfallLayoutItem[];
};
