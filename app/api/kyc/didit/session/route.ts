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
    
    // Call Didit API to create a session
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

    // Return the session URL immediately. We will create the KYC record in the webhook 
    // when Didit confirms the session actually completed (approved/rejected).
    // This prevents locking the user out if they just open and close the modal.
    return NextResponse.json({ session_id: sessionId, url: data.url || `https://verification.didit.me/v3/session/${sessionId}` });
  } catch (error) {
    console.error("Error creating Didit session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
