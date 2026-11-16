import {
  isVideoFile,
  MAX_VIDEOS_PER_CAUSE,
  validateGalleryVideo,
} from "@/lib/media/video";
import {
  validateCauseCoverImage,
  validateCauseGalleryImage,
} from "@/lib/media/cause-cover";
import {
  MAX_GALLERY_FILES,
  MAX_TOTAL_MEDIA_BYTES,
  mediaBytes,
} from "@/lib/schemas/cause.schema";

type MediaResult<T> =
  { ok: true; value: T } | { ok: false; error: string; keepCurrent?: boolean };

async function compress(file: File) {
  const { compressImage } = await import("@/utils/image-compression");
  return compressImage(file, 1600, 0.8);
}

/** Checks and compresses a cover image; returns the file or an error message. */
export async function prepareCoverImage(
  file: File,
): Promise<MediaResult<File>> {
  if (file.size > MAX_TOTAL_MEDIA_BYTES) {
    return {
      ok: false,
      error: "Cover image must be less than 100MB",
      keepCurrent: true,
    };
  }
  const invalid = await validateCauseCoverImage(file);
  if (invalid) return { ok: false, error: invalid };
  return { ok: true, value: await compress(file) };
}

/**
 * Checks incoming gallery files against the existing ones (count, videos,
 * total size) and compresses images. When `keepOriginalOnCompressError` is
 * set, an image that fails to compress is kept as it was.
 */
export async function prepareGalleryFiles(
  files: File[],
  existing: (File | string)[],
  { keepOriginalOnCompressError = false } = {},
): Promise<MediaResult<File[]>> {
  if (existing.length + files.length > MAX_GALLERY_FILES) {
    return {
      ok: false,
      error: `You can only upload a total of ${MAX_GALLERY_FILES} files`,
    };
  }

  const existingVideoCount = existing.filter(isVideoFile).length;
  const incomingVideos = files.filter((f) => f.type.startsWith("video/"));
  if (existingVideoCount + incomingVideos.length > MAX_VIDEOS_PER_CAUSE) {
    return {
      ok: false,
      error: `You can upload at most ${MAX_VIDEOS_PER_CAUSE} videos per cause`,
    };
  }

  try {
    const processed: File[] = [];
    let videoSlot = existingVideoCount;

    for (const file of files) {
      if (file.type.startsWith("video/")) {
        const videoError = await validateGalleryVideo(file, {
          existingVideoCount: videoSlot,
        });
        if (videoError) return { ok: false, error: videoError };
        videoSlot += 1;
        processed.push(file);
      } else if (file.type.startsWith("image/")) {
        const imageError = await validateCauseGalleryImage(file);
        if (imageError) return { ok: false, error: imageError };
        try {
          processed.push(await compress(file));
        } catch (err) {
          if (!keepOriginalOnCompressError) throw err;
          console.error("Compression error:", err);
          processed.push(file);
        }
      } else {
        return {
          ok: false,
          error: "Only images (any) and videos (MP4/WebM) are allowed",
        };
      }
    }

    if (mediaBytes(existing) + mediaBytes(processed) > MAX_TOTAL_MEDIA_BYTES) {
      return {
        ok: false,
        error: "Total multimedia size must be less than 100MB",
      };
    }
    return { ok: true, value: processed };
  } catch (error) {
    console.error("Multimedia processing error:", error);
    return { ok: false, error: "Failed to process media. Please try again." };
  }
}
