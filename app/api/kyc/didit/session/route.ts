import { NextResponse } from "next/server";
import { getCurrentUser } from "@/actions/auth-actions";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.DIDIT_API_KEY || process.env.DIDIT_CLIENT_SECRET || "";
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
    // 1. Check if user already has a pending Didit session
    const existingPendingKyc = await prisma.kyc_verifications.findFirst({
      where: { 
        user_id: user.id, 
        document_type: "didit", 
        status: "pending" 
      },
      orderBy: { created_at: "desc" }
    });

    if (existingPendingKyc) {
      if (existingPendingKyc.document_url?.includes(":::")) {
        console.log(`[Didit] Resuming existing session for user ${user.id}`);
        
        const parts = existingPendingKyc.document_url.split(":::");
        const sid = parts[0];
        const sessionUrl = parts[1];
        
        // Return the saved session URL directly
        return NextResponse.json({ 
          session_id: sid,
          url: sessionUrl
        });
      } else {
        // This is a legacy session that doesn't have a UUID saved. We can't sync it.
        // Delete it so we can generate a fresh, properly tracked session.
        console.log(`[Didit] Deleting legacy unsyncable session for user ${user.id}`);
        await prisma.kyc_verifications.delete({
          where: { id: existingPendingKyc.id }
        });
      }
    }

    // 2. Call Didit API to create a new session
    const response = await fetch("https://verification.didit.me/v3/session/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        workflow_id: process.env.DIDIT_WORKFLOW_ID || "",
        callback: `${origin}/dashboard/settings/kyc-setup`,
        vendor_data: user.id, // Pass user id to didit
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Didit session error:", errorText);
      return NextResponse.json({ error: "Failed to create Didit session" }, { status: response.status });
    }

    const data = await response.json();
    const sessionId = data.session_id;
    const sessionUrl = data.url || `https://verification.didit.me/v3/session/${sessionId}`;

    // 3. Save the newly generated link to the database along with its UUID session_id
    await prisma.kyc_verifications.create({
      data: {
        user_id: user.id,
        document_type: "didit",
        document_url: `${sessionId}:::${sessionUrl}`,
        status: "pending",
        verification_notes: "Session initialized via Didit",
        full_name: (user as any).full_name || (user as any).fullName || "Didit User",
      }
    });

    return NextResponse.json({ session_id: sessionId, url: sessionUrl });
  } catch (error) {
    console.error("Error creating Didit session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
