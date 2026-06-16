import { NextResponse } from "next/server";
import { generatePresignedGetUrl } from "@/lib/s3/s3-utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
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
