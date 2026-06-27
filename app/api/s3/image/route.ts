import { NextResponse } from "next/server";
import { generatePresignedGetUrl } from "@/lib/s3/s3-utils";

export const dynamic = "force-dynamic";

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

    // Generate the presigned URL
    const url = await generatePresignedGetUrl(key);

    // Redirect the browser to the actual S3 presigned URL
    return NextResponse.redirect(url);
  } catch (error: any) {
    console.error("S3 Image Proxy Error:", error);
    return NextResponse.json({ error: "Failed to load image" }, { status: 500 });
  }
}
