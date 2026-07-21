import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import {
  generatePresignedPutUrl,
  generateS3Key,
  type S3EntityType,
  type S3MediaType,
} from "@/lib/s3/s3-utils";
import {
  ALLOWED_VIDEO_MIME_TYPES,
  MAX_VIDEO_BYTES,
} from "@/lib/media/video";

export const dynamic = "force-dynamic";

const ALLOWED_ENTITY_TYPES: S3EntityType[] = [
  "causes",
  "petitions",
  "profiles",
  "kyc",
];

const ALLOWED_MEDIA_TYPES: S3MediaType[] = ["images", "videos", "documents"];

type PresignBody = {
  filename?: string;
  contentType?: string;
  entityType?: string;
  entityId?: string;
  mediaType?: string;
  fileSize?: number;
};

/**
 * Issues a short-lived S3 PUT URL so the browser can upload media
 * directly (required for videos — do not buffer through server actions).
 *
 * Note: the S3 bucket must allow CORS PUT from this app origin.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as PresignBody;
    const filename = (body.filename || "upload.bin").replace(
      /[^a-zA-Z0-9._-]/g,
      "_",
    );
    const contentType = body.contentType || "application/octet-stream";
    const entityType = body.entityType as S3EntityType;
    const mediaType = (body.mediaType || "images") as S3MediaType;
    const entityId = body.entityId;
    const fileSize = Number(body.fileSize ?? 0);

    if (!ALLOWED_ENTITY_TYPES.includes(entityType)) {
      return NextResponse.json(
        { error: "Invalid entityType" },
        { status: 400 },
      );
    }

    if (!ALLOWED_MEDIA_TYPES.includes(mediaType)) {
      return NextResponse.json(
        { error: "Invalid mediaType" },
        { status: 400 },
      );
    }

    if (mediaType === "videos") {
      if (
        !(ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(contentType)
      ) {
        return NextResponse.json(
          { error: "Videos must be video/mp4 or video/webm" },
          { status: 400 },
        );
      }
      if (fileSize > MAX_VIDEO_BYTES) {
        return NextResponse.json(
          {
            error: `Video exceeds ${Math.round(MAX_VIDEO_BYTES / (1024 * 1024))}MB limit`,
          },
          { status: 400 },
        );
      }
    }

    const uniqueId = Math.random().toString(36).substring(2, 15);
    const safeName = `${uniqueId}_${filename}`;

    const key = generateS3Key({
      entityType,
      userId,
      entityId,
      mediaType,
      filename: safeName,
    });

    const uploadUrl = await generatePresignedPutUrl(key, contentType, 900);

    return NextResponse.json({
      uploadUrl,
      key,
      contentType,
      expiresIn: 900,
    });
  } catch (error: any) {
    console.error("S3 presign error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create upload URL" },
      { status: 500 },
    );
  }
}
