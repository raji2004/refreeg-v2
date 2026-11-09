import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { resolveKycNameMismatch } from "@/lib/kyc/verification-engine";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || "adopt_id_name";

    if (action !== "adopt_id_name" && action !== "different_id") {
      return NextResponse.json({ error: "Invalid action", success: false }, { status: 400 });
    }

    const result = await resolveKycNameMismatch(session.user.id, action);
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to resolve mismatch", success: false }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("KYC Resolve Mismatch API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to resolve mismatch", success: false }, { status: 500 });
  }
}

