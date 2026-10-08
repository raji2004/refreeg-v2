import { NextResponse } from "next/server";
import {
  CLEAN_PRESENTATION,
  isCauseImageKey,
  loadCauseImage,
  normalizeMediaKey,
} from "@/lib/media/cause-image-render";
import { generatePresignedGetUrl } from "@/lib/s3/s3-utils";

const CAUSE_IMAGE_CACHE_CONTROL =
  "public, max-age=2592000, s-maxage=31536000, stale-while-revalidate=86400";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawKey = searchParams.get("key");

    if (!rawKey) {
      return NextResponse.json(
        { error: "Missing key parameter" },
        { status: 400 },
      );
    }

    const key = normalizeMediaKey(rawKey);

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
