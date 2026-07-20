import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import {
  generateS3Key,
  uploadToS3,
  type S3EntityType,
  type S3MediaType,
} from "@/lib/s3/s3-utils";
import {
  ALLOWED_VIDEO_MIME_TYPES,
  MAX_VIDEO_BYTES,
} from "@/lib/media/video";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ENTITY_TYPES: S3EntityType[] = [
  "causes",
  "petitions",
  "profiles",
  "kyc",
];

const ALLOWED_MEDIA_TYPES: S3MediaType[] = ["images", "videos", "documents"];

/**
 * Server-side S3 upload (multipart).
 * Used when browser → S3 CORS is not configured (e.g. local :3001).
 * Prefer direct presigned PUT in production once bucket CORS allows the app origin.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get("file");
    const entityType = String(form.get("entityType") || "") as S3EntityType;
    const mediaType = String(
      form.get("mediaType") || "images",
    ) as S3MediaType;
    const entityId = form.get("entityId")
      ? String(form.get("entityId"))
      : undefined;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

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
        !(ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(file.type)
      ) {
        return NextResponse.json(
          { error: "Videos must be video/mp4 or video/webm" },
          { status: 400 },
        );
      }
      if (file.size > MAX_VIDEO_BYTES) {
        return NextResponse.json(
          {
            error: `Video exceeds ${Math.round(MAX_VIDEO_BYTES / (1024 * 1024))}MB limit`,
          },
          { status: 400 },
        );
      }
    }

    const filename = (file.name || "upload.bin").replace(
      /[^a-zA-Z0-9._-]/g,
      "_",
    );
    const uniqueId = Math.random().toString(36).substring(2, 15);
    const key = generateS3Key({
      entityType,
      userId,
      entityId,
      mediaType,
      filename: `${uniqueId}_${filename}`,
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadToS3(buffer, key, file.type || "application/octet-stream");

    return NextResponse.json({ key });
  } catch (error: any) {
    console.error("S3 upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to upload file" },
      { status: 500 },
    );
  }
}
