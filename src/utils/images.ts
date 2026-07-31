import type { GalleryImage, OssImageMeta } from "../types/gallery.types";

const IMAGES_JSON_URL =
  "https://voidzero-memento.github.io/memento-oss/images.json";
const GALLERY_NAME_RE = /^banner(\d+)\.(png|jpe?g|webp)$/i;
const RESOLVE_CONCURRENCY = 8;

export const LOADING_BANNER_URL =
  "https://my-ledger.oss-cn-shenzhen.aliyuncs.com/loading-banner.png";

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

const parseGalleryMeta = (item: OssImageMeta): { id: number; meta: OssImageMeta } | null => {
  const matched = item.name.match(GALLERY_NAME_RE);
  if (!matched) return null;
  return { id: Number(matched[1]), meta: item };
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

const fetchImageList = async (signal?: AbortSignal): Promise<OssImageMeta[]> => {
  const response = await fetch(IMAGES_JSON_URL, { signal });
  if (!response.ok) {
    throw new Error(`images.json fetch failed: ${response.status}`);
  }
  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("images.json format invalid");
  }
  return data.filter(
    (item): item is OssImageMeta =>
      !!item &&
      typeof item === "object" &&
      typeof (item as OssImageMeta).name === "string" &&
      typeof (item as OssImageMeta).url === "string",
  );
};

/** 拉取清单、过滤画廊图、预加载并记录宽高比供瀑布流占位 */
export const resolveGalleryImages = async (
  onProgress?: (progress: ResolveProgress) => void,
  signal?: AbortSignal,
): Promise<GalleryImage[]> => {
  const raw = await fetchImageList(signal);
  if (signal?.aborted) return [];

  const entries = raw
    .map(parseGalleryMeta)
    .filter((item): item is { id: number; meta: OssImageMeta } => item !== null)
    .sort((a, b) => a.id - b.id);

  onProgress?.({ done: 0, total: entries.length });
  if (entries.length === 0) return [];

  let done = 0;
  const resolved = await runPool(
    entries,
    RESOLVE_CONCURRENCY,
    async ({ id, meta }) => {
      const probed = await probeImage(meta.url, signal);
      done += 1;
      onProgress?.({ done, total: entries.length });
      if (!probed.ok) return null;
      return {
        id,
        name: meta.name,
        url: meta.url,
        ratio: probed.height / probed.width,
      } satisfies GalleryImage;
    },
    signal,
  );

  if (signal?.aborted) return [];
  return resolved.filter((item): item is GalleryImage => item !== null);
};
