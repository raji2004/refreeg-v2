import { NextRequest, NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/api/cron-auth";
import { processDueAnnouncements } from "@/lib/email/announcement-sender";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const denied = assertCronAuthorized(req);
  if (denied) return denied;

  const { processed } = await processDueAnnouncements();
  return NextResponse.json({ success: true, processed });
}
