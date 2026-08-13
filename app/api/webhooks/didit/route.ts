import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { issueReferralRewardOnKycApproval } from "@/actions/kyc-actions";
import {
  sendKycSubmittedEmail,
  sendKycApprovedEmail,
  sendKycRejectedEmail,
  sendKycResubmittedEmail,
  sendKycSubmissionAdminNotification,
} from "@/services/mail";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Didit webhook received:", body);

    // Make extraction robust for Didit V3 payloads which might use camelCase or different keys
    const sessionId = body.session_id || body.id || body.session || (body.data && body.data.id) || (body.data && body.data.session_id);
    const status = body.status || (body.data && body.data.status); // e.g. "Approved" or "Declined"

    const vendorData = body.vendor_data || body.vendorData || (body.data && body.data.vendor_data) || (body.data && body.data.vendorData); // This is the user.id we sent!

    if (!sessionId) {
      console.error("[Didit Webhook] Missing session_id in payload:", body);
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

    if (kyc.status !== "pending" && kyc.status !== "resubmitted" && !isNewRecord) {
       return NextResponse.json({ message: "Already processed" });
    }

    const lowerStatus = status?.toLowerCase() || "";
    const isApproved = lowerStatus === "approved" || lowerStatus === "verified";
    const isRejected = lowerStatus === "declined" || lowerStatus === "rejected";
    const isResubmitted = lowerStatus === "resubmitted";
    const isExpired = lowerStatus === "expired" || lowerStatus === "abandoned";
    
    // Clear Expired Links: If the session has expired or was abandoned, delete the pending record
    if (isExpired && kyc.status === "pending") {
      console.log(`[Didit] Deleting expired/abandoned session for user ${kyc.user_id}`);
      await prisma.kyc_verifications.delete({
        where: { id: kyc.id }
      });
      return NextResponse.json({ success: true, message: "Expired session cleared" });
    }

    // Extract rejection reason if available
    const rejectionReason = body.decision_reason || body.reason || body.message || "Your document or selfie did not meet our verification requirements.";

    // Default to pending if it's "in progress", "in review", etc.
    let newStatus = "pending";
    if (isApproved) newStatus = "approved";
    if (isRejected) newStatus = "rejected";
    if (isResubmitted) newStatus = "resubmitted";

    // Only consider it manual review if status explicitly mentions review or pending
    const requiresManualReview = lowerStatus.includes("review") || lowerStatus === "pending";

    // Extract additional KYC data if Didit provides it in the body or inside a nested data object
    const webhookData = body.data || body;
    const dob = webhookData.date_of_birth || webhookData.dob || body.date_of_birth || body.dob;
    const address = webhookData.address || body.address;
    const city = webhookData.city || body.city;
    const state = webhookData.state || webhookData.region || body.state || body.region;
    const country = webhookData.country || body.country;
    const postal = webhookData.postal_code || webhookData.zip || body.postal_code || body.zip;
    const phone = webhookData.phone || body.phone;
    const firstName = webhookData.first_name || body.first_name;
    const lastName = webhookData.last_name || body.last_name;
    
    let fullName = kyc.full_name;
    if (firstName && lastName) {
      fullName = `${firstName} ${lastName}`;
    } else if (webhookData.full_name || body.full_name) {
      fullName = webhookData.full_name || body.full_name;
    }

    // Update kyc record
    await prisma.kyc_verifications.update({
      where: { id: kyc.id },
      data: {
        status: newStatus,
        verification_notes: `Automated Didit result: ${status}${isRejected || isResubmitted ? ` - ${rejectionReason}` : ''}`,
        ...(fullName && fullName !== "Didit User" && { full_name: fullName }),
        ...(dob && { dob }),
        ...(address && { address }),
        ...(city && { city }),
        ...(state && { state }),
        ...(country && { country }),
        ...(postal && { postal }),
        ...(phone && { phone }),
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
      
      try {
        if (isApproved) {
          await sendKycApprovedEmail(userProfile.email, userName);
          try {
            await issueReferralRewardOnKycApproval(kyc.user_id);
          } catch (err) {
            console.error("Referral reward error:", err);
          }
        } else if (isRejected) {
          await sendKycRejectedEmail(userProfile.email, userName, rejectionReason);
        } else if (isResubmitted) {
          await sendKycResubmittedEmail(userProfile.email, userName, rejectionReason);
        } else if (newStatus === "pending" && requiresManualReview) {
          // Didit is explicitly in manual review
          await sendKycSubmittedEmail(userProfile.email, userName);
          await sendKycSubmissionAdminNotification(
            userProfile.email,
            userName,
            kyc.user_id,
            "https://verification.didit.me/admin" // Or wherever admins check Didit
          );
        }
      } catch (emailError) {
        console.error("Failed to send KYC emails, but DB was updated:", emailError);
      }
    }

    try {
      revalidatePath("/", "layout");
      revalidatePath("/dashboard", "layout");
      revalidatePath("/dashboard/settings", "layout");
    } catch (e) {
      console.error("Failed to revalidate paths:", e);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Didit webhook error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
