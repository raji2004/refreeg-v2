import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { withMobileCache } from "@/lib/api/mobile-cache";
import {
  CLEAN_PRESENTATION,
  isCauseImageKey,
  loadCauseImage,
  normalizeMediaKey,
} from "@/lib/media/cause-image-render";
import { s3Client } from "@/lib/s3/s3-client";
import { generatePresignedGetUrl, getBucketName } from "@/lib/s3/s3-utils";

const CAUSE_IMAGE_CACHE_CONTROL =
  "public, max-age=2592000, s-maxage=31536000, stale-while-revalidate=86400";
const S3_IMAGE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes server memory cache

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isSafeExternalImageUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "0.0.0.0" ||
      host === "[::1]" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function presentCauseImage(key: string) {
  const image = await loadCauseImage(key);

  return new Response(
    image.kind === "cached" ? image.body : new Uint8Array(image.output),
    {
      headers: {
        "Cache-Control": CAUSE_IMAGE_CACHE_CONTROL,
        "Content-Type":
          image.kind === "cached" ? image.contentType : "image/jpeg",
        "X-RefreeG-Media-Presentation":
          image.kind === "cached" ? "cached" : image.presentation,
      },
    },
  );
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawKey = searchParams.get("key");

    const urlParam = searchParams.get("url");
    if (urlParam && isSafeExternalImageUrl(urlParam)) {
      try {
        const fetched = await fetch(urlParam);
        if (fetched.ok) {
          const buffer = Buffer.from(await fetched.arrayBuffer());
          return new Response(buffer, {
            status: 200,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, OPTIONS",
              "Cache-Control":
                "public, max-age=86400, stale-while-revalidate=86400",
              "Content-Type":
                fetched.headers.get("content-type") || "image/jpeg",
            },
          });
        }
      } catch (proxyErr) {
        console.error("External image proxy error:", proxyErr);
      }
    }

    if (!rawKey) {
      return NextResponse.json(
        { error: "Missing key parameter" },
        { status: 400 },
      );
    }

    const key = normalizeMediaKey(rawKey);

    if (isSafeExternalImageUrl(key)) {
      try {
        const fetched = await fetch(key);
        if (fetched.ok) {
          const buffer = Buffer.from(await fetched.arrayBuffer());
          return new Response(buffer, {
            status: 200,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, OPTIONS",
              "Cache-Control":
                "public, max-age=86400, stale-while-revalidate=86400",
              "Content-Type":
                fetched.headers.get("content-type") || "image/jpeg",
            },
          });
        }
      } catch (proxyErr) {
        console.error("Direct external key proxy error:", proxyErr);
      }
    }

    if (
      searchParams.get("presentation") === CLEAN_PRESENTATION &&
      isCauseImageKey(key)
    ) {
      try {
        return await presentCauseImage(key);
      } catch (error) {
        console.error(
          "Cause image presentation failed, serving original:",
          error,
        );
      }
    }

    try {
      const rawS3 = await withMobileCache(
        `s3:raw:${key}`,
        S3_IMAGE_CACHE_TTL_MS,
        async () => {
          const object = await s3Client.send(
            new GetObjectCommand({ Bucket: getBucketName(), Key: key }),
          );
          if (!object.Body) return null;
          return {
            bytes: Buffer.from(await object.Body.transformToByteArray()),
            contentType: object.ContentType || "image/jpeg",
          };
        },
      );

      if (rawS3) {
        return new Response(rawS3.bytes, {
          status: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Cache-Control":
              "public, max-age=2592000, s-maxage=31536000, stale-while-revalidate=86400",
            "Content-Type": rawS3.contentType,
          },
        });
      }
    } catch (s3Err) {
      console.warn(
        "Direct S3 fetch failed, falling back to presigned URL:",
        s3Err,
      );
    }

    const url = await generatePresignedGetUrl(key);
    return NextResponse.redirect(url);
  } catch (error: any) {
    console.error("S3 Image Proxy Error:", error);
    return NextResponse.json(
      { error: "Failed to load image" },
      { status: 500 },
    );
  }
}
