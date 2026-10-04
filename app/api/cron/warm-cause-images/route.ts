import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { warmCauseImage } from "@/lib/media/cause-image-render";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// remote-deploy.sh derives the same token from AUTH_SECRET, so no extra
// secret has to be provisioned. Without AUTH_SECRET the route stays closed.
function expectedToken(): string | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  return createHash("sha256")
    .update(`refreeg-cache-warm:${secret}`)
    .digest("hex");
}

function isAuthorized(req: NextRequest): boolean {
  const expected = expectedToken();
  const header = req.headers.get("authorization") || "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!expected || provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

/** Renders every cause cover into the disk cache, one at a time. */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const causes = await prisma.cause.findMany({
    where: { image: { not: null } },
    select: { image: true },
  });
  const images = [...new Set(causes.map((c) => c.image as string))];

  const counts = { rendered: 0, cached: 0, skipped: 0, failed: 0 };
  for (const image of images) {
    try {
      counts[await warmCauseImage(image)]++;
    } catch (error) {
      counts.failed++;
      console.error("Cause image warm failed:", image, error);
    }
  }

  return NextResponse.json({ total: images.length, ...counts });
}
