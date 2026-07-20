/** Gallery video limits for cause create/edit (Phase 1). */
export const MAX_VIDEOS_PER_CAUSE = 2;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB
export const MAX_VIDEO_DURATION_SEC = 90;
export const ALLOWED_VIDEO_MIME_TYPES = ["video/mp4", "video/webm"] as const;

export type AllowedVideoMime = (typeof ALLOWED_VIDEO_MIME_TYPES)[number];

export function isAllowedVideoMime(type: string): type is AllowedVideoMime {
  return (ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(type);
}

export function isVideoFile(file: File | string): boolean {
  if (typeof file === "string") {
    return (
      /\.(mp4|webm)(\?|$)/i.test(file) ||
      file.includes("/videos/") ||
      /video\//i.test(file)
    );
  }
  return file.type.startsWith("video/");
}

export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(url);
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error("Could not determine video duration"));
        return;
      }
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read video metadata"));
    };
    video.src = url;
  });
}

/**
 * Validates a gallery video before upload.
 * Returns an error message or null if OK.
 */
export async function validateGalleryVideo(
  file: File,
  opts?: { existingVideoCount?: number },
): Promise<string | null> {
  if (!isAllowedVideoMime(file.type)) {
    return "Videos must be MP4 or WebM";
  }

  if (file.size > MAX_VIDEO_BYTES) {
    return `Each video must be under ${Math.round(MAX_VIDEO_BYTES / (1024 * 1024))}MB`;
  }

  const existing = opts?.existingVideoCount ?? 0;
  if (existing >= MAX_VIDEOS_PER_CAUSE) {
    return `You can upload at most ${MAX_VIDEOS_PER_CAUSE} videos per cause`;
  }

  try {
    const duration = await getVideoDuration(file);
    if (duration > MAX_VIDEO_DURATION_SEC) {
      return `Videos must be ${MAX_VIDEO_DURATION_SEC} seconds or shorter`;
    }
  } catch {
    return "Could not read this video. Try another MP4 or WebM file.";
  }

  return null;
}
