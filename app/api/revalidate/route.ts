import { revalidatePath, revalidateTag } from "next/cache";
import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Secret travels in a header (query strings end up in logs).
    const secret = request.headers.get("x-revalidation-secret") || "";

    // Protect this route - ensure REVALIDATION_SECRET is set in your .env
    const expectedSecret = process.env.REVALIDATION_SECRET;
    const a = Buffer.from(secret);
    const b = Buffer.from(expectedSecret || "");
    if (!expectedSecret || a.length !== b.length || !timingSafeEqual(a, b)) {
      return NextResponse.json(
        { message: "Invalid secret token" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { path, tag, type } = body;

    if (path) {
      // e.g. revalidatePath('/dashboard', 'page')
      revalidatePath(path, type || "page");
      return NextResponse.json({ revalidated: true, path, now: Date.now() });
    }

    if (tag) {
      revalidateTag(tag);
      return NextResponse.json({ revalidated: true, tag, now: Date.now() });
    }

    // If neither path nor tag is provided, we can default to clearing the root layout cache
    // which effectively clears most of the site's cache
    revalidatePath("/", "layout");

    return NextResponse.json({
      revalidated: true,
      message: "Cleared all route cache",
      now: Date.now(),
    });
  } catch (error) {
    console.error("Revalidation error:", error);
    return NextResponse.json(
      { message: "Error revalidating" },
      { status: 500 },
    );
  }
}
