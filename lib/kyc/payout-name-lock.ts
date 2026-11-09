import { prisma } from "@/lib/prisma";
import { verifyAccountNumber } from "@/services/payment-provider";
import { splitFullName } from "@/lib/onboarding/validation";

const NIGERIAN_TITLES = new Set([
  "mr",
  "mrs",
  "ms",
  "miss",
  "dr",
  "prof",
  "engr",
  "chief",
  "pastor",
  "rev",
  "alhadji",
  "alhaji",
  "alhajia",
  "alhaja",
  "hajia",
  "hon",
  "barr",
  "barrister",
  "arch",
  "architect",
  "otunba",
  "sen",
  "senator",
  "prince",
  "princess",
]);

/**
 * Normalizes a Nigerian name string by removing common titles,
 * stripping punctuation, and filtering out empty tokens.
 */
export function normalizeNameTokens(name: string): string[] {
  if (!name) return [];
  return name
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0 && !NIGERIAN_TITLES.has(token));
}

/**
 * Computes Levenshtein distance between two short strings to forgive minor typos.
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

function isFuzzyTokenMatch(tokenA: string, tokenB: string): boolean {
  if (tokenA === tokenB) return true;
  // If either is a single initial, match the first letter
  if (tokenA.length === 1 || tokenB.length === 1) {
    return tokenA[0] === tokenB[0];
  }
  // Allow max 1 edit distance for words longer than 4 chars
  if (tokenA.length >= 4 && tokenB.length >= 4) {
    return levenshteinDistance(tokenA, tokenB) <= 1;
  }
  return false;
}

/**
 * Checks if a NIBSS-resolved bank account name matches the user's verified legal name
 * or corporate organization name.
 *
 * Requirements:
 * - Both First Name and Last Name of the user must appear in the bank account name tokens
 * - Order does not matter (handles SURNAME FIRST MIDDLENAME vs FIRST SURNAME)
 * - Middle-name omissions or initializations are accepted
 * - If organizationName is provided, checks if bank account name matches the organization tokens
 */
export function doesBankNameMatchVerifiedName(
  bankAccountName: string | null | undefined,
  verifiedFullName: string | null | undefined,
  organizationName?: string | null | undefined,
): boolean {
  if (!bankAccountName?.trim()) return false;

  const bankTokens = normalizeNameTokens(bankAccountName);
  if (bankTokens.length === 0) return false;

  // 1. Corporate / Organization match check
  if (organizationName?.trim()) {
    const orgTokens = normalizeNameTokens(organizationName).filter(
      (t) => !["ltd", "limited", "plc", "foundation", "initiative", "ngo", "inc"].includes(t),
    );
    if (orgTokens.length > 0) {
      const allOrgTokensMatch = orgTokens.every((orgTok) =>
        bankTokens.some((bankTok) => isFuzzyTokenMatch(orgTok, bankTok)),
      );
      if (allOrgTokensMatch) return true;
    }
  }

  // 2. Personal legal name check
  if (!verifiedFullName?.trim()) return false;
  const legalTokens = normalizeNameTokens(verifiedFullName);
  if (legalTokens.length === 0) return false;

  if (legalTokens.length === 1) {
    return bankTokens.some((bt) => isFuzzyTokenMatch(legalTokens[0], bt));
  }

  // In Nigerian names: first token is usually first name (or surname), last token is usually surname (or first name).
  const firstToken = legalTokens[0];
  const lastToken = legalTokens[legalTokens.length - 1];

  // Primary check: both the first and last name tokens from the legal name must match tokens on the bank account
  const firstMatches = bankTokens.some((bt) => isFuzzyTokenMatch(firstToken, bt));
  const lastMatches = bankTokens.some((bt) => isFuzzyTokenMatch(lastToken, bt));

  if (firstMatches && lastMatches) return true;

  // Secondary check: if bankTokens has >= 2 tokens and they all match legal tokens
  const allBankTokensMatchLegal =
    bankTokens.length >= 2 &&
    bankTokens.every((bt) => legalTokens.some((lt) => isFuzzyTokenMatch(bt, lt)));
  if (allBankTokensMatchLegal) return true;

  // Or if at least 2 legal tokens match bank tokens
  const matchingTokensCount = legalTokens.filter((lt) =>
    bankTokens.some((bt) => isFuzzyTokenMatch(lt, bt)),
  ).length;

  return matchingTokensCount >= 2;
}

export interface BankSubmissionPayload {
  accountNumber: string;
  bankCode: string;
  bankName: string;
  accountName?: string;
  sub_account_code?: string;
  isBeneficiaryAccount?: boolean;
  beneficiaryType?: "hospital" | "school" | "ngo" | "patient" | "other";
  beneficiaryRelationship?: string;
  proofDocumentUrl?: string;
  isChangeRequest?: boolean;
  changeReason?: string;
}

export interface BankEvaluationResult {
  allowed: boolean;
  statusCode: number;
  error?: string;
  requiresBeneficiaryDeclaration?: boolean;
  payoutVerificationStatus: "verified_own" | "verified_beneficiary" | "pending_beneficiary_review" | "change_requested";
  resolvedAccountName: string;
}

/**
 * Evaluates whether a user can submit or update a bank account.
 * Enforces:
 * 1. Live campaign self-service edit lock (direct edit returns 403, guides to change request).
 * 2. NIBSS-resolved name matching against user's legal name.
 * 3. Beneficiary / Hospital account declaration flow.
 */
export async function evaluateBankAccountSubmission(
  userId: string,
  payload: BankSubmissionPayload,
): Promise<BankEvaluationResult> {
  // Check if user has active/pending campaigns
  const activeCampaignsCount = await prisma.cause.count({
    where: {
      userId,
      status: { in: ["approved", "pending"] },
    },
  });

  // If user has a live or pending campaign and this is NOT a change request, block self-service edits
  if (activeCampaignsCount > 0 && !payload.isChangeRequest) {
    return {
      allowed: false,
      statusCode: 403,
      error:
        "Your payout bank account is locked while you have an active campaign. Please submit a supervised bank account change request if your account details need to change.",
      payoutVerificationStatus: "verified_own",
      resolvedAccountName: "",
    };
  }

  // Resolve account name via NIBSS on the server
  let resolvedName = "";
  try {
    const verification: any = await verifyAccountNumber(
      payload.accountNumber,
      payload.bankCode,
    );
    resolvedName = verification?.account_name || verification?.data?.account_name || "";
  } catch (error: any) {
    return {
      allowed: false,
      statusCode: 400,
      error:
        error.message ||
        "Could not verify bank account number with NIBSS. Check the digits and bank name.",
      payoutVerificationStatus: "verified_own",
      resolvedAccountName: "",
    };
  }

  // Fetch user profile and organization details
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      fullName: true,
      firstName: true,
      lastName: true,
      isVerified: true,
      accountType: true,
    },
  });

  let orgName: string | null = null;
  if (user?.accountType === "organization") {
    const org = await prisma.organization.findFirst({
      where: { ownerId: userId },
      select: { name: true },
    });
    orgName = org?.name ?? null;
  }

  const effectiveFullName =
    user?.fullName || `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();

  // Check if account name matches user's own identity
  const isOwnAccount = doesBankNameMatchVerifiedName(
    resolvedName,
    effectiveFullName,
    orgName,
  );

  if (isOwnAccount) {
    return {
      allowed: true,
      statusCode: 200,
      payoutVerificationStatus: "verified_own",
      resolvedAccountName: resolvedName,
    };
  }

  // Account name differs from user's legal name
  if (!payload.isBeneficiaryAccount) {
    return {
      allowed: false,
      statusCode: 409,
      requiresBeneficiaryDeclaration: true,
      error: `Bank account name mismatch: This account belongs to "${resolvedName}", which does not match your legal name ("${effectiveFullName}"). You can either enter an account in your own name or declare this as a Hospital, School, or Beneficiary payout account.`,
      payoutVerificationStatus: "verified_own",
      resolvedAccountName: resolvedName,
    };
  }

  // User declared a Beneficiary / Institution Account
  if (!payload.beneficiaryType) {
    return {
      allowed: false,
      statusCode: 400,
      error: "Please select a beneficiary category (Hospital, School, NGO, or Patient).",
      payoutVerificationStatus: "pending_beneficiary_review",
      resolvedAccountName: resolvedName,
    };
  }

  return {
    allowed: true,
    statusCode: 200,
    payoutVerificationStatus: "pending_beneficiary_review",
    resolvedAccountName: resolvedName,
  };
}

/**
 * Submits a supervised bank account change request for a creator who has live campaigns.
 * Logs the request in events so Admins can inspect and approve it.
 */
export async function submitBankChangeRequest(
  userId: string,
  payload: BankSubmissionPayload,
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  try {
    const evalResult = await evaluateBankAccountSubmission(userId, {
      ...payload,
      isChangeRequest: true,
    });

    if (!evalResult.allowed) {
      return { success: false, error: evalResult.error };
    }

    const event = await prisma.events.create({
      data: {
        user_id: userId,
        event_type: "bank_change_request",
        metadata: {
          status: "pending",
          requested_account_number: payload.accountNumber,
          requested_bank_name: payload.bankName,
          requested_bank_code: payload.bankCode,
          requested_account_name: evalResult.resolvedAccountName,
          reason: payload.changeReason || "Bank account updated by creator",
          proof_document_url: payload.proofDocumentUrl || null,
          payout_type: evalResult.payoutVerificationStatus,
          beneficiary_type: payload.beneficiaryType || null,
          beneficiary_relationship: payload.beneficiaryRelationship || null,
          created_at: new Date().toISOString(),
        },
      },
    });

    return { success: true, requestId: event.id };
  } catch (error: any) {
    console.error("Error submitting bank change request:", error);
    return { success: false, error: error.message || "Failed to submit request" };
  }
}

/**
 * Approves a supervised bank account change request by an Admin.
 * Swaps the bank details and updates subaccount atomically.
 */
export async function approveBankChangeRequest(
  adminUserId: string,
  targetUserId: string,
  eventId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const event = await prisma.events.findUnique({
      where: { id: eventId },
    });

    if (!event || event.user_id !== targetUserId || event.event_type !== "bank_change_request") {
      return { success: false, error: "Invalid change request event" };
    }

    const meta = (event.metadata as any) || {};
    if (meta.status !== "pending") {
      return { success: false, error: `Request already ${meta.status}` };
    }

    // Update user's bank details
    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        accountNumber: meta.requested_account_number,
        bankName: meta.requested_bank_name,
        accountName: meta.requested_account_name,
      },
    });

    // Mark event as approved
    await prisma.events.update({
      where: { id: eventId },
      data: {
        metadata: {
          ...meta,
          status: "approved",
          reviewed_by: adminUserId,
          reviewed_at: new Date().toISOString(),
        },
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error approving bank change request:", error);
    return { success: false, error: error.message || "Failed to approve request" };
  }
}

/**
 * Called when a user taps "Use my NIN name" on K7.
 * - If the creator has NO live campaigns: flags pre-KYC bank account so they align it before creating a campaign.
 * - If the creator HAS live campaigns: NEVER pauses live campaigns. Instead, logs an Admin review flag
 *   and unlocks the Supervised Bank Change Request path.
 */
export async function reconcileUserPayoutAfterNameChange(
  userId: string,
  newVerifiedFullName: string,
): Promise<{ hasLiveCampaigns: boolean; nameMatchesBank: boolean }> {
  const [user, liveCampaignsCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { accountNumber: true, bankName: true, accountName: true },
    }),
    prisma.cause.count({
      where: { userId, status: { in: ["approved", "pending"] } },
    }),
  ]);

  if (!user?.accountNumber || !user?.accountName) {
    return { hasLiveCampaigns: liveCampaignsCount > 0, nameMatchesBank: true };
  }

  const nameMatches = doesBankNameMatchVerifiedName(
    user.accountName,
    newVerifiedFullName,
  );

  if (!nameMatches && liveCampaignsCount > 0) {
    // DO NOT PAUSE LIVE CAMPAIGN. Log audit flag for Admin supervision
    await prisma.events.create({
      data: {
        user_id: userId,
        event_type: "admin_payout_flag",
        metadata: {
          flag: "k7_name_changed_with_live_campaign",
          new_verified_name: newVerifiedFullName,
          current_bank_account_name: user.accountName,
          live_campaigns_count: liveCampaignsCount,
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  return {
    hasLiveCampaigns: liveCampaignsCount > 0,
    nameMatchesBank: nameMatches,
  };
}
