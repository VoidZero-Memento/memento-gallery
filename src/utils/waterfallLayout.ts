import type { GalleryImage } from "../types/gallery.types";
import type { WaterfallBreakpoints, WaterfallLayout, WaterfallLayoutItem } from "../types/waterfall.types";

/** 与 GalleryTile 结构对齐：上内边距 10 + frame 上下各 10 */
const TILE_CHROME_H = 30;
/** frame 左右 padding 合计，用于从列宽推算图片内容宽 */
const FRAME_PAD_X = 20;
/** 光晕/倾斜余量，对应原 waterfall-item 上下 padding */
const GLOW_SLACK = 24;

const resolveColWidth = (
  wrapperWidth: number,
  breakpoints: WaterfallBreakpoints,
  gutter: number,
  initWidth: number,
): number => {
  const sizes = Object.keys(breakpoints)
    .map(Number)
    .sort((a, b) => a - b);

  for (const size of sizes) {
    if (wrapperWidth <= size) {
      const cols = breakpoints[size].rowPerView;
      return Math.floor((wrapperWidth - (cols - 1) * gutter) / cols);
    }
  }
  return initWidth;
};

const resolveCols = (wrapperWidth: number, colWidth: number, gutter: number): number =>
  Math.max(1, Math.floor((wrapperWidth + gutter) / (colWidth + gutter)));

const resolveOffsetX = (
  wrapperWidth: number,
  cols: number,
  colWidth: number,
  gutter: number,
): number => {
  const total = cols * (colWidth + gutter) - gutter;
  return Math.max(0, (wrapperWidth - total) / 2);
};

const estimateItemHeight = (colWidth: number, ratio: number): number => {
  const contentW = Math.max(1, colWidth - FRAME_PAD_X);
  return TILE_CHROME_H + contentW * ratio + GLOW_SLACK;
};

/** 按已知 ratio 预计算瀑布流坐标，避免量 DOM；horizontalOrder 为轮转列 */
export const computeWaterfallLayout = (
  list: GalleryImage[],
  wrapperWidth: number,
  options: {
    width: number;
    gutter: number;
    breakpoints: WaterfallBreakpoints;
  },
): WaterfallLayout => {
  if (wrapperWidth <= 0 || list.length === 0) {
    return { cols: 0, colWidth: 0, offsetX: 0, height: 0, items: [] };
  }

  const { width, gutter, breakpoints } = options;
  const colWidth = resolveColWidth(wrapperWidth, breakpoints, gutter, width);
  const cols = resolveCols(wrapperWidth, colWidth, gutter);
  const offsetX = resolveOffsetX(wrapperWidth, cols, colWidth, gutter);
  const colHeights = new Array<number>(cols).fill(0);
  const items: WaterfallLayoutItem[] = new Array(list.length);

  for (let i = 0; i < list.length; i += 1) {
    const item = list[i];
    const col = i % cols;
    const x = gutter * col + colWidth * col + offsetX;
    const y = colHeights[col];
    const height = estimateItemHeight(colWidth, item.ratio);
    items[i] = { index: i, item, x, y, width: colWidth, height };
    colHeights[col] += height + gutter;
  }

  // 列高累加时每张后都加了 gutter，容器总高去掉末尾那一段，避免底部空一截
  const tallest = Math.max(0, ...colHeights);
  return {
    cols,
    colWidth,
    offsetX,
    height: tallest > 0 ? Math.max(0, tallest - gutter) : 0,
    items,
  };
};

export const filterVisibleLayoutItems = (
  items: WaterfallLayoutItem[],
  viewTop: number,
  viewBottom: number,
): WaterfallLayoutItem[] =>
  items.filter((entry) => entry.y < viewBottom && entry.y + entry.height > viewTop);
