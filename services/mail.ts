"use server";
import "server-only";

import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import Handlebars from "handlebars";
import type { TemplateDelegate } from "handlebars";
import { headers } from "next/headers";
import { getCurrentUser } from "@/actions/auth-actions";
import { getProfile } from "@/actions/profile-actions";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

const TEMPLATE_DIR = path.join(process.cwd(), "services", "templates");

function loadTemplate(templateName: string): TemplateDelegate {
  const templatePath = path.join(TEMPLATE_DIR, `${templateName}.html`);
  const templateSource = fs.readFileSync(templatePath, "utf-8");
  return Handlebars.compile(templateSource);
}

interface SendMailOptions {
  to: string;
  subject: string;
  templateName: string;
  context: Record<string, unknown>;
  from?: string;
  cc?: string[];
  bcc?: string[];
}

export async function sendMail({
  to,
  subject,
  templateName,
  context,
  from = process.env.EMAIL_FROM  || "noreply@refreeg.com",
  cc,
  bcc,
}: SendMailOptions) {
  try {
    const template = loadTemplate(templateName);
    const html = template(context);

    const info = await transporter.sendMail({
      from,
      to,
      cc,
      bcc,
      subject,
      html,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    return { success: false, error };
  }
}

export async function sendOtpEmail(context: {
  email: string;
  userName: string;
  otpCode: string;
}) {
  const currentYear = new Date().getFullYear();

  return sendMail({
    to: context.email,
    subject: "Your RefreeG Verification Code",
    templateName: "otp-verification",
    context: {
      userName: context.userName,
      otpCode: context.otpCode,
      currentYear,
    },
  });
}

export async function sendPasswordResetEmail(context: {
  email: string;
  resetUrl: string;
}) {
  const currentYear = new Date().getFullYear();

  return sendMail({
    to: context.email,
    subject: "Reset Your RefreeG Password",
    templateName: "password-reset",
    context: {
      resetUrl: context.resetUrl,
      currentYear,
    },
  });
}

export async function sendCauseUnderReviewEmail(context: {
  causeName: string;
  reviewTimeframe?: string;
  dashboardUrl?: string;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "User not found" };
  }
  const profile = await getProfile(user.id);
  const currentYear = new Date().getFullYear();

  return sendMail({
    to: profile?.email || "",
    subject: "Your Cause is Under Review",
    templateName: "cause-under-review",
    context: {
      ...context,
      userName: profile?.full_name || "User",
      organizationName: "Refreeg",
      reviewTimeframe: context.reviewTimeframe || "3-5 business days",
      dashboardUrl: context.dashboardUrl,
      currentYear,
    },
  });
}

export async function sendPetitionUnderReviewEmail(context: {
  petitionName: string;
  reviewTimeframe?: string;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "User not found" };
  }
  const profile = await getProfile(user.id);
  return sendMail({
    to: profile?.email || "",
    subject: "Your Petition is Under Review",
    templateName: "petition-under-review",
    context: {
      ...context,
      userName: profile?.full_name || "User",
      organizationName: "Refreeg",
      reviewTimeframe: context.reviewTimeframe || "3-5 business days",
    },
  });
}

export async function sendPetitionApprovedEmailForUser(
  userId: string,
  context: { petitionName: string },
) {
  const profile = await getProfile(userId);
  if (!profile?.email) throw new Error("Recipient email not found");

  const petitionLink =
    "https://www.refreeg.com/dashboard/petitions?status=approved";

  return sendMail({
    to: profile.email,
    subject: "Your Petition Has Been Approved ✅",
    templateName: "petition-approved",
    context: {
      ...context,
      userName: profile.full_name || "User",
      organizationName: "Refreeg",
      petitionLink,
    },
  });
}

export async function sendPetitionRejectedEmailForUser(
  userId: string,
  context: { petitionName: string; rejectionReason?: string },
) {
  const profile = await getProfile(userId);
  if (!profile?.email) throw new Error("Recipient email not found");

  const petitionResubmitLink =
    "https://www.refreeg.com/dashboard/petitions?status=rejected";

  return sendMail({
    to: profile.email,
    subject: "Update on Your Petition ❌",
    templateName: "petition-rejected",
    context: {
      ...context,
      userName: profile.full_name || "User",
      organizationName: "Refreeg",
      petitionResubmitLink,
    },
  });
}

export async function sendBankAccountAddedEmail(context: {
  bankName: string;
  accountNumber: string;
  accountName: string;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "User not found" };
  }
  const profile = await getProfile(user.id);
  const currentYear = new Date().getFullYear();
  return sendMail({
    to: profile?.email || "",
    subject: "Did You Just Add a Bank Account to RefreeG? 🏦",
    templateName: "bank-account-added",
    context: {
      ...context,
      userName: profile?.full_name || "Refreegerian",
      currentYear,
    },
  });
}

export async function sendKycSubmittedEmail(
  userEmail: string,
  userName: string,
) {
  return sendMail({
    to: userEmail,
    subject: "KYC Verification Submitted - Refreeg",
    templateName: "kyc-submitted",
    context: {
      userName,
      organizationName: "Refreeg",
      reviewTimeframe: "3-5 business days",
      dashboardUrl: "https://www.refreeg.com/dashboard/settings?tab=kyc",
    },
  });
}

export async function sendKycApprovedEmail(
  userEmail: string,
  userName: string,
) {
  return sendMail({
    to: userEmail,
    subject: "KYC Verification Approved - Refreeg",
    templateName: "kyc-approved",
    context: {
      userName,
      organizationName: "Refreeg",
      createCauseUrl: "https://www.refreeg.com/dashboard/settings?tab=kyc",
    },
  });
}

export async function sendKycRejectedEmail(
  userEmail: string,
  userName: string,
  rejectionReason: string,
) {
  return sendMail({
    to: userEmail,
    subject: "KYC Verification Update - Refreeg",
    templateName: "kyc-rejected",
    context: {
      userName,
      organizationName: "Refreeg",
      rejectionReason,
      kycResubmitLink: "https://www.refreeg.com/dashboard/settings?tab=kyc",
    },
  });
}

export async function sendCauseRejectedEmailForUser(
  userId: string,
  context: { causeName: string; rejectionReason?: string; dashboardUrl: string },
) {
  const profile = await getProfile(userId);
  if (!profile?.email) throw new Error("Recipient email not found");

  return sendMail({
    to: profile.email,
    subject: "Update on Your Campaign ❌",
    templateName: "cause-rejected",
    context: {
      ...context,
      userName: profile.full_name || "User",
      organizationName: "Refreeg",
      causeResubmitLink: context.dashboardUrl,
    },
  });
}

export async function sendCauseSubmissionAdminNotification(
  userName: string,
  userEmail: string,
  causeTitle: string,
  reviewUrl: string,
) {
  const { getAdminEmails } = await import("@/actions/role-actions");
  const adminEmails = await getAdminEmails();

  if (adminEmails.length === 0) {
    return { success: false, error: "No admin emails found" };
  }

  const currentYear = new Date().getFullYear();

  const emailPromises = adminEmails.map((email: string) =>
    sendMail({
      to: email,
      subject: "New Cause Submission Requires Review - Refreeg",
      templateName: "cause-submission-admin-notification",
      context: {
        adminName: "Admin",
        userName,
        userEmail,
        causeTitle,
        reviewUrl,
        organizationName: "Refreeg",
        currentYear,
      },
    }),
  );

  try {
    const results = await Promise.allSettled(emailPromises);
    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return {
      success: successful > 0,
      sent: successful,
      failed,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to send notifications",
    };
  }
}

export async function sendPetitionSubmissionAdminNotification(
  userName: string,
  userEmail: string,
  petitionTitle: string,
  reviewUrl: string,
) {
  const { getAdminEmails } = await import("@/actions/role-actions");
  const adminEmails = await getAdminEmails();

  if (adminEmails.length === 0) {
    return { success: false, error: "No admin emails found" };
  }

  const currentYear = new Date().getFullYear();

  const emailPromises = adminEmails.map((email: string) =>
    sendMail({
      to: email,
      subject: "New Petition Submission Requires Review - Refreeg",
      templateName: "petition-submission-admin-notification",
      context: {
        adminName: "Admin",
        userName,
        userEmail,
        petitionTitle,
        reviewUrl,
        organizationName: "Refreeg",
        currentYear,
      },
    }),
  );

  try {
    const results = await Promise.allSettled(emailPromises);
    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return {
      success: successful > 0,
      sent: successful,
      failed,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to send notifications",
    };
  }
}

export async function sendLoginNotificationEmail(context: {
  device?: string;
  loginTime?: string;
  email?: string;
  userName?: string;
}) {
  let profileEmail = context.email || "";
  let profileName = context.userName || "User";

  if (!profileEmail) {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "User not found" };
    }
    const profile = await getProfile(user.id);
    profileEmail = profile?.email || "";
    profileName = profile?.full_name || "User";
  }

  const currentYear = new Date().getFullYear();

  // Resolve IP server-side from the request headers instead of
  // relying on a client-side fetch to api.ipify.org.
  // This is faster and more secure for production.
  let ipAddress = "Unknown IP";
  try {
    const headersList = await headers();
    const xff = headersList.get("x-forwarded-for");
    const xri = headersList.get("x-real-ip");
    
    let detectedIp = (xff?.split(",")[0] || xri || "Unknown IP").trim();
    
    // Label localhost clearly for local development
    if (detectedIp === "::1" || detectedIp === "127.0.0.1") {
      detectedIp = `${detectedIp} (Localhost)`;
    }
    
    ipAddress = detectedIp;
  } catch {
    // headers() may fail outside of a request context
  }

  return sendMail({
    to: profileEmail,
    subject: "New Login Notification",
    templateName: "login-notification",
    context: {
      userName: profileName,
      loginTime: context.loginTime || new Date().toLocaleString(),
      device: context.device || "Unknown Device",
      ipAddress,
      currentYear,
    },
  });
}

export async function sendCauseEditedEmail({
  causeName,
  reviewTimeframe = "3-5 business days",
  dashboardUrl,
}: {
  causeName: string;
  reviewTimeframe?: string;
  dashboardUrl?: string;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "User not found" };
  }
  const profile = await getProfile(user.id);
  const currentYear = new Date().getFullYear();

  return sendMail({
    to: profile?.email || "",
    subject: "Cause Edited - Under Review",
    templateName: "cause-edited",
    context: {
      userName: profile?.full_name || "User",
      causeName,
      reviewTimeframe,
      dashboardUrl,
      currentYear,
    },
  });
}

export async function sendPledgeConfirmationEmail({
  to,
  userName,
  causeTitle,
  amount,
  reminderDate,
  donateUrl,
}: {
  to: string;
  userName: string;
  causeTitle: string;
  amount: number;
  reminderDate: string;
  donateUrl: string;
}) {
  const currentYear = new Date().getFullYear();
  return sendMail({
    to,
    subject: `Your pledge to "${causeTitle}" is confirmed 🤝`,
    templateName: "pledge-confirmation",
    context: {
      userName,
      causeTitle,
      amount: amount.toLocaleString(),
      reminderDate,
      donateUrl,
      currentYear,
    },
  });
}

export async function sendPledgeReminderEmail({
  to,
  userName,
  causeTitle,
  amount,
  reminderDate,
  donateUrl,
}: {
  to: string;
  userName: string;
  causeTitle: string;
  amount: number;
  reminderDate: string;
  donateUrl: string;
}) {
  const currentYear = new Date().getFullYear();
  return sendMail({
    to,
    subject: `⏰ Reminder: Your pledge to "${causeTitle}" is due today`,
    templateName: "pledge-reminder",
    context: {
      userName,
      causeTitle,
      amount: amount.toLocaleString(),
      reminderDate,
      donateUrl,
      currentYear,
    },
  });
}

export async function sendMilestoneEmail({
  to,
  causeTitle,
  causeUrl,
  milestone,
}: {
  to: string;
  causeTitle: string;
  causeUrl: string;
  milestone: 50 | 100;
}) {
  const currentYear = new Date().getFullYear();
  return sendMail({
    to,
    subject:
      milestone === 100
        ? `Goal Achieved! 🎉 "${causeTitle}" is 100% funded`
        : `Halfway there! 🚀 "${causeTitle}" reached 50%`,
    templateName: `milestone-${milestone}`,
    context: {
      causeTitle,
      causeUrl,
      currentYear,
    },
  });
}

export async function sendCampaignExpiringEmail({
  to,
  causeTitle,
  causeUrl,
  amountRaised,
  goalAmount,
  percent,
}: {
  to: string;
  causeTitle: string;
  causeUrl: string;
  amountRaised: number;
  goalAmount: number;
  percent: number;
}) {
  const currentYear = new Date().getFullYear();
  return sendMail({
    to,
    subject: `⏳ 48 hours left: Support "${causeTitle}"`,
    templateName: "campaign-expiring",
    context: {
      causeTitle,
      causeUrl,
      amountRaised: amountRaised.toLocaleString(),
      goalAmount: goalAmount.toLocaleString(),
      percent,
      currentYear,
    },
  });
}

export const sendTestEmail = async (email: string) => {
  return sendMail({
    to: email,
    subject: "Test Email",
    templateName: "login-notification",
    context: {
      userName: "Test User",
      loginTime: new Date().toLocaleString(),
      device: "Test Device",
      ipAddress: "Test IP",
    },
  });
};

export async function sendIncompleteCauseSetupEmail(context: {
  continueUrl: string;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "User not found" };
  }
  const profile = await getProfile(user.id);
  const currentYear = new Date().getFullYear();
  return sendMail({
    to: profile?.email || "",
    subject: "Don't let your cause stop halfway 🌱",
    templateName: "incomplete-cause-setup",
    context: {
      ...context,
      userName: profile?.full_name || "User",
      currentYear,
      continueUrl: context.continueUrl,
    },
  });
}

export async function sendIncompleteKycVerificationEmail(context: {
  continueUrl: string;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "User not found" };
  }
  const profile = await getProfile(user.id);
  const currentYear = new Date().getFullYear();
  return sendMail({
    to: profile?.email || "",
    subject: "Just one more step to unlock your account ✅",
    templateName: "incomplete-kyc",
    context: {
      ...context,
      userName: profile?.full_name || "User",
      currentYear,
    },
  });
}

export async function sendIncompletePetitionDraftEmail(context: {
  continueUrl: string;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "User not found" };
  }
  const profile = await getProfile(user.id);
  const currentYear = new Date().getFullYear();
  return sendMail({
    to: profile?.email || "",
    subject: "Your petition is waiting for you to finish it ✍️",
    templateName: "incomplete-petition",
    context: {
      ...context,
      userName: profile?.full_name || "User",
      currentYear,
      continueUrl: context.continueUrl,
    },
  });
}

export async function sendUnfinishedDonationEmail(context: {
  causeName: string;
  continueUrl: string;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "User not found" };
  }
  const profile = await getProfile(user.id);
  const currentYear = new Date().getFullYear();
  return sendMail({
    to: profile?.email || "",
    subject: `You were almost done supporting ${context.causeName} ❤️`,
    templateName: "unfinished-donation",
    context: {
      ...context,
      userName: profile?.full_name || "there",
      currentYear,
      continueUrl: context.continueUrl,
    },
  });
}

export async function sendWelcomeEmailToUser(
  userEmail: string,
  userName: string,
  profileSetupUrl: string,
) {
  return sendMail({
    to: userEmail,
    subject: "Welcome to Refreeg 🌍 Let's get you started",
    templateName: "welcome-email",
    context: {
      userName,
      profileSetupUrl,
      currentYear: new Date().getFullYear(),
    },
  });
}

export async function sendPetitionSignedEmailToUser(
  userEmail: string,
  userName: string,
  petitionName: string,
  petitionUrl: string,
  isAnonymous: boolean = false,
) {
  return sendMail({
    to: userEmail,
    subject: "Thank you for signing! ✍️",
    templateName: "petition-signed",
    context: {
      userName,
      petitionName,
      petitionUrl,
      isAnonymous,
      currentYear: new Date().getFullYear(),
    },
  });
}

export async function sendNewSignatureNotificationEmail(
  creatorEmail: string,
  creatorName: string,
  petitionName: string,
  petitionUrl: string,
  signerName: string,
  message?: string,
) {
  return sendMail({
    to: creatorEmail,
    subject: `New signature for "${petitionName}"! 🎉`,
    templateName: "new-signature",
    context: {
      creatorName,
      petitionName,
      petitionUrl,
      signerName,
      message: message || "No message provided",
      hasMessage: !!message,
      currentYear: new Date().getFullYear(),
    },
  });
}

export async function sendPetitionGoalReachedEmail(
  creatorEmail: string,
  creatorName: string,
  petitionName: string,
  petitionUrl: string,
  totalSignatures: number,
  goalAmount: number,
) {
  return sendMail({
    to: creatorEmail,
    subject: `🎉 Your petition "${petitionName}" has reached its goal!`,
    templateName: "petition-goal-reached",
    context: {
      creatorName,
      petitionName,
      petitionUrl,
      totalSignatures,
      goalAmount,
      currentYear: new Date().getFullYear(),
    },
  });
}

export async function sendKycSubmissionAdminNotification(
  userEmail: string,
  userName: string,
  userId: string,
  kycReviewUrl: string,
) {
  const { getAdminEmails } = await import("@/actions/role-actions");
  const adminEmails = await getAdminEmails();

  if (adminEmails.length === 0) {
    return { success: false, error: "No admin emails found" };
  }

  const emailPromises = adminEmails.map((email: string) =>
    sendMail({
      to: email,
      subject: "New KYC Submission Requires Review - Refreeg",
      templateName: "kyc-submission-admin-notification",
      context: {
        adminName: "Admin",
        userName,
        userEmail,
        kycReviewUrl,
        organizationName: "Refreeg",
        currentYear: new Date().getFullYear(),
      },
    }),
  );

  try {
    const results = await Promise.allSettled(emailPromises);
    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return {
      success: successful > 0,
      sent: successful,
      failed,
    };
  } catch (error) {
    console.error("Error sending KYC admin notifications:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to send notifications",
    };
  }
}

export async function sendKycReminderEmail(
  userEmail: string,
  userName: string,
) {
  const currentYear = new Date().getFullYear();
  return sendMail({
    to: userEmail,
    subject: "🔐 Your Refreeg account isn't verified yet — here's why it matters",
    templateName: "kyc-reminder",
    context: {
      userName,
      kycUrl: "https://www.refreeg.com/dashboard/settings?tab=kyc",
      currentYear,
    },
  });
}

export async function sendDonationReceivedEmail({
  to,
  ownerName,
  donorName,
  causeTitle,
  amount,
  causeUrl,
  amountRaised,
  goalAmount,
}: {
  to: string;
  ownerName: string;
  donorName: string;
  causeTitle: string;
  amount: number;
  causeUrl: string;
  amountRaised?: number;
  goalAmount?: number;
}) {
  const currentYear = new Date().getFullYear();
  const showProgress =
    typeof amountRaised === "number" && typeof goalAmount === "number" && goalAmount > 0;
  const percent = showProgress
    ? Math.min(Math.round(((amountRaised ?? 0) / (goalAmount ?? 1)) * 100), 100)
    : 0;

  return sendMail({
    to,
    subject: `💚 You just received a donation for "${causeTitle}"!`,
    templateName: "donation-received",
    context: {
      ownerName,
      donorName,
      causeTitle,
      amount: amount.toLocaleString(),
      causeUrl,
      showProgress,
      amountRaised: amountRaised?.toLocaleString() ?? "0",
      goalAmount: goalAmount?.toLocaleString() ?? "0",
      percent,
      currentYear,
    },
  });
}
