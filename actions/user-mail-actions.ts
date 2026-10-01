"use server";

// The only mail sends the browser may trigger. Each one emails the signed-in
// user (resolved server-side), so callers can't choose the recipient.
import * as mail from "@/services/mail";

export async function sendCauseUnderReviewEmail(
  context: Parameters<typeof mail.sendCauseUnderReviewEmail>[0],
) {
  return mail.sendCauseUnderReviewEmail(context);
}

export async function sendCauseEditedEmail(
  context: Parameters<typeof mail.sendCauseEditedEmail>[0],
) {
  return mail.sendCauseEditedEmail(context);
}

export async function sendIncompleteCauseSetupEmail(
  context: Parameters<typeof mail.sendIncompleteCauseSetupEmail>[0],
) {
  return mail.sendIncompleteCauseSetupEmail(context);
}

export async function sendPetitionUnderReviewEmail(
  context: Parameters<typeof mail.sendPetitionUnderReviewEmail>[0],
) {
  return mail.sendPetitionUnderReviewEmail(context);
}

export async function sendIncompletePetitionDraftEmail(
  context: Parameters<typeof mail.sendIncompletePetitionDraftEmail>[0],
) {
  return mail.sendIncompletePetitionDraftEmail(context);
}

export async function sendBankAccountAddedEmail(
  context: Parameters<typeof mail.sendBankAccountAddedEmail>[0],
) {
  return mail.sendBankAccountAddedEmail(context);
}

export async function sendUnfinishedDonationEmail(
  context: Parameters<typeof mail.sendUnfinishedDonationEmail>[0],
) {
  return mail.sendUnfinishedDonationEmail(context);
}
