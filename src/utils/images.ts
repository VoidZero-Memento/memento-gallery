import type { GalleryImage, GatePayload } from "../types/gallery.types";

const OSS_REGION = "oss-cn-shenzhen";
const FILE_PREFIX = "banner";
const FILE_EXTS = ["png", "jpg"] as const;
const RESOLVE_CONCURRENCY = 8;

export const LOADING_BANNER_URL =
  "https://my-ledger.oss-cn-shenzhen.aliyuncs.com/loading-banner.png";

export const buildOssBase = (spaceName: string): string =>
  `https://${spaceName.trim()}.${OSS_REGION}.aliyuncs.com`;

type ProbeOk = { ok: true; width: number; height: number };
type ProbeFail = { ok: false };
type ProbeResult = ProbeOk | ProbeFail;

const probeImage = (url: string, signal?: AbortSignal): Promise<ProbeResult> =>
  new Promise((resolve) => {
    if (signal?.aborted) {
      resolve({ ok: false });
      return;
    }
    const img = new Image();
    const finish = (result: ProbeResult) => {
      img.onload = null;
      img.onerror = null;
      signal?.removeEventListener("abort", onAbort);
      resolve(result);
    };
    const onAbort = () => finish({ ok: false });
    img.onload = () =>
      finish({
        ok: true,
        width: img.naturalWidth || 1,
        height: img.naturalHeight || 1,
      });
    img.onerror = () => finish({ ok: false });
    signal?.addEventListener("abort", onAbort, { once: true });
    img.src = url;
  });

export const resolveImageUrl = async (
  base: string,
  id: number,
  signal?: AbortSignal,
): Promise<GalleryImage | null> => {
  for (const ext of FILE_EXTS) {
    if (signal?.aborted) return null;
    const name = `${FILE_PREFIX}${id}.${ext}`;
    const url = `${base}/${name}`;
    const probed = await probeImage(url, signal);
    if (probed.ok) {
      return {
        id,
        name,
        url,
        ratio: probed.height / probed.width,
      };
    }
  }
  return null;
};

const runPool = async <T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
  signal?: AbortSignal,
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const run = async () => {
    while (cursor < items.length) {
      if (signal?.aborted) return;
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  };

  const size = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: size }, () => run()));
  return results;
};

export type ResolveProgress = {
  done: number;
  total: number;
};

/** 解析扩展名、预加载，并记录宽高比供瀑布流占位 */
export const resolveGalleryImages = async (
  payload: GatePayload,
  onProgress?: (progress: ResolveProgress) => void,
  signal?: AbortSignal,
): Promise<GalleryImage[]> => {
  const base = buildOssBase(payload.spaceName);
  const ids = Array.from({ length: payload.count }, (_, i) => i + 1);

  onProgress?.({ done: 0, total: ids.length });
  if (ids.length === 0) return [];

  let done = 0;
  const resolved = await runPool(
    ids,
    RESOLVE_CONCURRENCY,
    async (id) => {
      const image = await resolveImageUrl(base, id, signal);
      done += 1;
      onProgress?.({ done, total: ids.length });
      return image;
    },
    signal,
  );

  if (signal?.aborted) return [];
  return resolved.filter((item): item is GalleryImage => item !== null);
};
