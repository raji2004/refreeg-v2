import "server-only";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import {
  readCachedCauseImage,
  writeCachedCauseImage,
} from "@/lib/media/cause-image-cache";
import { findLegacyNormalizedCenterCrop } from "@/lib/media/legacy-normalized-image";
import { createRenderQueue } from "@/lib/media/render-queue";
import { s3Client } from "@/lib/s3/s3-client";
import { getBucketName } from "@/lib/s3/s3-utils";

export const CLEAN_PRESENTATION = "clean-v3";
const CAUSE_CARD_MAX_WIDTH = 1200;
const CAUSE_CARD_JPEG_QUALITY = 75;

// This box is small and also runs Postgres: keep libvips from caching decoded
// images or spreading one job across every core.
sharp.cache(false);
sharp.concurrency(1);

// After a deploy every cover is a cache miss at once: share one render per
// key and run at most two at a time; the rest queue.
const renderQueue = createRenderQueue(2);

/**
 * Turns a stored media value (bare key, `/api/s3/image?key=...` URL, or an
 * encoded form of either) into the S3 key.
 */
export function normalizeMediaKey(raw: string): string {
  let key = raw;
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded.includes("/api/s3/image")) {
      const inner = new URL(decoded, "http://localhost");
      const innerKey = inner.searchParams.get("key");
      if (innerKey) key = decodeURIComponent(innerKey);
    } else {
      key = decoded;
    }
  } catch {}
  return key;
}

export function isCauseImageKey(key: string): boolean {
  return key.startsWith("uploads/causes/") && key.includes("/images/");
}

// Versioned so changing the crop, width or quality invalidates old files.
function cacheKeyFor(key: string) {
  return `${CLEAN_PRESENTATION}:w${CAUSE_CARD_MAX_WIDTH}:q${CAUSE_CARD_JPEG_QUALITY}:${key}`;
}

async function renderCauseImage(
  key: string,
): Promise<{ output: Buffer; presentation: string }> {
  const object = await s3Client.send(
    new GetObjectCommand({ Bucket: getBucketName(), Key: key }),
  );
  if (!object.Body) throw new Error("S3 image has no body");

  const input = Buffer.from(await object.Body.transformToByteArray());
  const metadata = await sharp(input, { failOn: "none" }).metadata();
  let output: Buffer<ArrayBufferLike> = input;
  let presentation = "original";

  if (metadata.width && metadata.height) {
    const analysis = await sharp(input, { failOn: "none" })
      .resize({ width: 1000, fit: "inside", withoutEnlargement: true })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const crop = findLegacyNormalizedCenterCrop({
      data: analysis.data,
      width: analysis.info.width,
      height: analysis.info.height,
      channels: analysis.info.channels,
    });

    if (crop) {
      const scale = metadata.width / analysis.info.width;
      const left = Math.max(0, Math.round(crop.left * scale));
      const width = Math.min(
        metadata.width - left,
        Math.round(crop.width * scale),
      );
      output = await sharp(input, { failOn: "none" })
        .extract({ left, top: 0, width, height: metadata.height })
        .toBuffer();
      presentation = "recovered-portrait";
    }
  }

  output = await sharp(output, { failOn: "none" })
    .resize({
      width: CAUSE_CARD_MAX_WIDTH,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: CAUSE_CARD_JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  return { output, presentation };
}

function renderAndCache(key: string) {
  const cacheKey = cacheKeyFor(key);
  return renderQueue.run(cacheKey, async () => {
    const result = await renderCauseImage(key);
    try {
      await writeCachedCauseImage(cacheKey, result.output, "image/jpeg");
    } catch (error) {
      console.error("Cause image cache write failed:", error);
    }
    return result;
  });
}

/** The cached cover if there is one, otherwise renders (and caches) it. */
export async function loadCauseImage(
  key: string,
): Promise<
  | { kind: "cached"; body: ReadableStream; contentType: string }
  | { kind: "rendered"; output: Buffer; presentation: string }
> {
  const cached = await readCachedCauseImage(cacheKeyFor(key));
  if (cached) return { kind: "cached", ...cached };

  const { output, presentation } = await renderAndCache(key);
  return { kind: "rendered", output, presentation };
}

/**
 * Renders a cover into the cache ahead of any page view. Accepts any stored
 * media value; non-cover values are skipped.
 */
export async function warmCauseImage(
  raw: string | null | undefined,
): Promise<"skipped" | "cached" | "rendered"> {
  if (!raw) return "skipped";
  const key = normalizeMediaKey(raw);
  if (!isCauseImageKey(key)) return "skipped";

  const cached = await readCachedCauseImage(cacheKeyFor(key));
  if (cached) {
    await cached.body.cancel();
    return "cached";
  }

  await renderAndCache(key);
  return "rendered";
}
