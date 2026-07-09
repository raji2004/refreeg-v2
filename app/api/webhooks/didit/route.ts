import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueReferralRewardOnKycApproval } from "@/actions/kyc-actions";
import {
  sendKycSubmittedEmail,
  sendKycApprovedEmail,
  sendKycRejectedEmail,
  sendKycSubmissionAdminNotification,
} from "@/services/mail";

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

    let isNewRecord = false;
    if (!kyc) {
      // If no record exists (because they just started the session and we didn't save it), create it now.
      if (vendorData) {
        const user = await prisma.user.findUnique({ where: { id: vendorData } });
        if (user) {
          isNewRecord = true;
          kyc = await prisma.kyc_verifications.create({
            data: {
              user_id: user.id,
              document_type: "didit",
              document_url: sessionId,
              status: "pending",
              verification_notes: "Automated verification processed via Didit webhook",
              full_name: (user as any).full_name || (user as any).fullName || "Didit User",
            }
          });
        }
      }

      if (!kyc) {
        return NextResponse.json({ error: "KYC record not found and could not be created" }, { status: 404 });
      }
    }

    if (kyc.status !== "pending" && !isNewRecord) {
       return NextResponse.json({ message: "Already processed" });
    }

    const lowerStatus = status?.toLowerCase() || "";
    const isApproved = lowerStatus === "approved" || lowerStatus === "verified";
    const isRejected = lowerStatus === "declined" || lowerStatus === "rejected";
    
    // Extract rejection reason if available
    const rejectionReason = body.decision_reason || body.reason || body.message || "Your document or selfie did not meet our verification requirements.";

    // Default to pending if it's "in progress", "in review", etc.
    let newStatus = "pending";
    if (isApproved) newStatus = "approved";
    if (isRejected) newStatus = "rejected";

    // Update kyc record
    await prisma.kyc_verifications.update({
      where: { id: kyc.id },
      data: {
        status: newStatus,
        verification_notes: `Automated Didit result: ${status}${isRejected ? ` - ${rejectionReason}` : ''}`
      }
    });

    // Update user record
    await prisma.user.update({
      where: { id: kyc.user_id },
      data: { isVerified: isApproved }
    });

    // Send Emails
    const userProfile = await prisma.user.findUnique({ where: { id: kyc.user_id }, select: { email: true } });
    if (userProfile?.email) {
      const userName = kyc.full_name || "User";
      
      if (isApproved) {
        await sendKycApprovedEmail(userProfile.email, userName);
        try {
          await issueReferralRewardOnKycApproval(kyc.user_id);
        } catch (err) {
          console.error("Referral reward error:", err);
        }
      } else if (isRejected) {
        await sendKycRejectedEmail(userProfile.email, userName, rejectionReason);
      } else if (newStatus === "pending") {
        // Didit is in manual review or processing
        await sendKycSubmittedEmail(userProfile.email, userName);
        await sendKycSubmissionAdminNotification(
          userProfile.email,
          userName,
          kyc.user_id,
          "https://verification.didit.me/admin" // Or wherever admins check Didit
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Didit webhook error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
