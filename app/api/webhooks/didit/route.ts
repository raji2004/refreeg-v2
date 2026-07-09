import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueReferralRewardOnKycApproval } from "@/actions/kyc-actions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Didit webhook received:", body);

    const sessionId = body.session_id;
    const status = body.status; // e.g. "Approved" or "Declined"

    const vendorData = body.vendor_data; // This is the user.id we sent!

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    // Find the pending KYC verification. We prefer finding by vendorData (user.id) 
    // to handle cases where they completed an older session after clicking the button twice.
    let kyc = null;
    if (vendorData) {
      kyc = await prisma.kyc_verifications.findFirst({
        where: { user_id: vendorData, document_type: "didit", status: "pending" },
        orderBy: { created_at: "desc" }
      });
    }

    // Fallback to session ID if vendor_data wasn't passed back
    if (!kyc) {
      kyc = await prisma.kyc_verifications.findFirst({
        where: { document_url: sessionId, document_type: "didit" }
      });
    }

    if (!kyc) {
      return NextResponse.json({ error: "KYC record not found" }, { status: 404 });
    }

    if (kyc.status !== "pending") {
       return NextResponse.json({ message: "Already processed" });
    }

    const lowerStatus = status?.toLowerCase() || "";
    const isApproved = lowerStatus === "approved" || lowerStatus === "verified";
    const isRejected = lowerStatus === "declined" || lowerStatus === "rejected";
    
    // Default to pending if it's "in progress", "in review", etc.
    let newStatus = "pending";
    if (isApproved) newStatus = "approved";
    if (isRejected) newStatus = "rejected";

    // Update kyc record
    await prisma.kyc_verifications.update({
      where: { id: kyc.id },
      data: {
        status: newStatus,
        verification_notes: `Automated Didit result: ${status}`
      }
    });

    // Update user record
    await prisma.user.update({
      where: { id: kyc.user_id },
      data: { isVerified: isApproved }
    });

    if (isApproved) {
      // Issue referral reward
      try {
        await issueReferralRewardOnKycApproval(kyc.user_id);
      } catch (err) {
        console.error("Referral reward error:", err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Didit webhook error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
