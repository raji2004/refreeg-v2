// app/api/dev/sync-milestones/route.ts
import { NextRequest, NextResponse } from "next/server";
import { syncMilestoneRequirements } from "@/lib/proof-milestones";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Dev only" }, { status: 403 });
  }
  const { causeId } = await req.json();
  await syncMilestoneRequirements(causeId);
  return NextResponse.json({ success: true });
}
