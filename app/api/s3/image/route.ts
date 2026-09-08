import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { findLegacyNormalizedCenterCrop } from "@/lib/media/legacy-normalized-image";
import { s3Client } from "@/lib/s3/s3-client";
import {
  generatePresignedGetUrl,
  getBucketName,
} from "@/lib/s3/s3-utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CLEAN_PRESENTATION = "clean-v3";

async function presentCauseImage(key: string) {
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

  return new Response(new Uint8Array(output), {
    headers: {
      "Cache-Control":
        "public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400",
      "Content-Type": object.ContentType || "image/jpeg",
      "X-RefreeG-Media-Presentation": presentation,
    },
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
    }

    // If the key looks like an encoded proxy URL (double-wrapped), normalize it.
    // Example problematic value: "/api/s3/image?key=uploads%2F..." or the encoded form of that.
    try {
      // decode once to handle encoded values
      const decoded = decodeURIComponent(key);

      if (decoded.includes('/api/s3/image')) {
        const inner = new URL(decoded, 'http://localhost');
        const innerKey = inner.searchParams.get('key');
        if (innerKey) key = decodeURIComponent(innerKey);
      } else {
        key = decoded;
      }
    } catch (e) {
      // decoding failed; fall back to original key
    }

    if (
      searchParams.get("presentation") === CLEAN_PRESENTATION &&
      key.startsWith("uploads/causes/") &&
      key.includes("/images/")
    ) {
      try {
        return await presentCauseImage(key);
      } catch (error) {
        console.error("Cause image presentation failed, serving original:", error);
      }
    }

    // Generate the presigned URL
    const url = await generatePresignedGetUrl(key);

    // Redirect the browser to the actual S3 presigned URL
    return NextResponse.redirect(url);
  } catch (error: any) {
    console.error("S3 Image Proxy Error:", error);
    return NextResponse.json({ error: "Failed to load image" }, { status: 500 });
  }
}
