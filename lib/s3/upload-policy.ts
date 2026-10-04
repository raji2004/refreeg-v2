import type { S3EntityType, S3MediaType } from "@/lib/s3/s3-utils";
import { ALLOWED_VIDEO_MIME_TYPES, MAX_VIDEO_BYTES } from "@/lib/media/video";

const ALLOWED_ENTITY_TYPES: S3EntityType[] = [
  "causes",
  "petitions",
  "profiles",
  "kyc",
];

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// SVG and HTML are deliberately absent: they can carry script.
const ALLOWED_TYPES: Record<S3MediaType, readonly string[]> = {
  images: IMAGE_TYPES,
  documents: ["application/pdf", ...IMAGE_TYPES],
  videos: ALLOWED_VIDEO_MIME_TYPES,
};

const MAX_BYTES: Record<S3MediaType, number> = {
  images: 10 * 1024 * 1024,
  documents: 10 * 1024 * 1024,
  videos: MAX_VIDEO_BYTES,
};

// Becomes a path segment of the S3 key; keep it to a plain id.
const ENTITY_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export type UploadRequest = {
  entityType: string;
  mediaType: string;
  entityId?: string;
  contentType: string;
  size: number;
};

/** Returns an error message, or null when the upload is allowed. */
export function validateUpload(req: UploadRequest): string | null {
  if (!ALLOWED_ENTITY_TYPES.includes(req.entityType as S3EntityType)) {
    return "Invalid entityType";
  }

  const mediaType = req.mediaType as S3MediaType;
  if (!Object.hasOwn(ALLOWED_TYPES, mediaType)) {
    return "Invalid mediaType";
  }

  if (req.entityId !== undefined && !ENTITY_ID_PATTERN.test(req.entityId)) {
    return "Invalid entityId";
  }

  if (!ALLOWED_TYPES[mediaType].includes(req.contentType)) {
    return mediaType === "videos"
      ? "Videos must be video/mp4 or video/webm"
      : `Unsupported file type for ${mediaType}`;
  }

  if (!(req.size > 0)) {
    return "File is empty";
  }

  if (req.size > MAX_BYTES[mediaType]) {
    return `File exceeds ${Math.round(MAX_BYTES[mediaType] / (1024 * 1024))}MB limit`;
  }

  return null;
}
