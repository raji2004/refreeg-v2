import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import {
  generatePresignedPutUrl,
  generateS3Key,
  type S3EntityType,
  type S3MediaType,
} from "@/lib/s3/s3-utils";
import { validateUpload } from "@/lib/s3/upload-policy";

export const dynamic = "force-dynamic";

type PresignBody = {
  filename?: string;
  contentType?: string;
  entityType?: string;
  entityId?: string;
  mediaType?: string;
  fileSize?: number;
};

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

    // fileSize is client-reported; the signed URL pins the content type but
    // S3 does not enforce this size, so it only stops honest oversized files.
    const invalid = validateUpload({
      entityType,
      mediaType,
      entityId,
      contentType,
      size: fileSize,
    });
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
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
