import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import {
  generateS3Key,
  uploadToS3,
  type S3EntityType,
  type S3MediaType,
} from "@/lib/s3/s3-utils";
import { validateUpload } from "@/lib/s3/upload-policy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
    const mediaType = String(form.get("mediaType") || "images") as S3MediaType;
    const entityId = form.get("entityId")
      ? String(form.get("entityId"))
      : undefined;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const invalid = validateUpload({
      entityType,
      mediaType,
      entityId,
      contentType: file.type,
      size: file.size,
    });
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
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
    await uploadToS3(buffer, key, file.type);

    return NextResponse.json({ key });
  } catch (error: any) {
    console.error("S3 upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to upload file" },
      { status: 500 },
    );
  }
}
