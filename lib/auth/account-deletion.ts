import { prisma } from "@/lib/prisma";
import {
  buildAnonymizedEmail,
  DATA_RETENTION_POLICY,
} from "@/lib/config/retention";
import { deleteUserPersonalS3Files, extractS3Key } from "@/lib/s3/s3-utils";

export interface AccountDeletionResult {
  success: boolean;
  statusCode: number;
  error?: string;
  code?: string;
}

const DIDIT_BASE_URL = "https://verification.didit.me/v3";

/**
 * Attempts to delete any third-party Didit KYC sessions associated with the user.
 * Fails gracefully so third-party network issues do not trap a user's deletion request.
 */
async function deleteDiditSessions(sessionIds: string[]): Promise<void> {
  const apiKey = process.env.DIDIT_API_KEY;
  if (!apiKey || sessionIds.length === 0) return;

  await Promise.allSettled(
    sessionIds.map(async (sessionId) => {
      await fetch(`${DIDIT_BASE_URL}/session/${encodeURIComponent(sessionId)}/`, {
        method: "DELETE",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
      });
    }),
  );
}

/**
 * Executes compliant account deletion for both web and mobile:
 * 1. Blocks deletion ONLY when the user has an active, unpaused campaign with raised funds
 *    (`status === "approved"`, `paused === false`, `raised > 0`).
 *    (Note: RefreeG settles funds directly and does not hold payout balances, so pending payouts
 *    or milestone updates do not block account deletion.)
 * 2. Purges personal S3 files (profile photos, KYC images, and unfunded campaign/petition media)
 *    and deletes Didit KYC sessions.
 * 3. Anonymizes financial records (`Donation`, `crypto_donations`, `pledges`, `subscriptions`,
 *    `DonorReferralAttribution`) so audit trails remain intact without retaining PII.
 * 4. Deletes personal data (`kyc_verifications`, `DeviceToken`, `user_saved_cards`, `Notification`,
 *    `bookmarks`, `saved_searches`, comments, unfunded causes, petitions, sessions, OAuth accounts).
 * 5. Hard-deletes the `User` row when no historical funded causes exist, or scrubs all PII into a
 *    deactivated tombstone record when historical funded causes require a non-null foreign key.
 */
export async function executeUserAccountDeletion(
  userId: string,
): Promise<AccountDeletionResult> {
  if (!userId) {
    return {
      success: false,
      statusCode: 400,
      error: "User ID is required",
      code: "MISSING_USER_ID",
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        profilePhoto: true,
      },
    });

    if (!user) {
      return {
        success: false,
        statusCode: 404,
        error: "Account not found",
        code: "USER_NOT_FOUND",
      };
    }

    // 1. Check for active campaigns that currently have raised funds
    const activeFundedCause = await prisma.cause.findFirst({
      where: {
        userId,
        status: "approved",
        paused: false,
        raised: { gt: 0 },
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (activeFundedCause) {
      return {
        success: false,
        statusCode: 409,
        code: "ACTIVE_FUNDED_CAMPAIGN",
        error: `You have an active campaign with raised funds ("${activeFundedCause.title}"). Please pause or close your active campaign before deleting your account, or contact ${DATA_RETENTION_POLICY.SUPPORT_EMAIL} for assistance.`,
      };
    }

    // 2. Gather KYC records, unfunded causes, and petitions to clean up S3 and Didit
    const [kycRecords, userCauses, userPetitions] = await Promise.all([
      prisma.kyc_verifications.findMany({
        where: { user_id: userId },
        select: { id: true, document_type: true, document_url: true },
      }),
      prisma.cause.findMany({
        where: { userId },
        select: {
          id: true,
          image: true,
          multimedia: true,
          video_links: true,
          raised: true,
          _count: {
            select: {
              donations: true,
              crypto_donations: true,
              pledges: true,
              subscriptions: true,
            },
          },
        },
      }),
      prisma.petitions.findMany({
        where: { user_id: userId },
        select: {
          id: true,
          image: true,
          multimedia: true,
          video_links: true,
        },
      }),
    ]);

    const diditSessionIds: string[] = [];
    const extraS3Keys: (string | null | undefined)[] = [user.profilePhoto];

    for (const kyc of kycRecords) {
      if (!kyc.document_url) continue;
      if (kyc.document_type === "didit" && kyc.document_url.includes(":::")) {
        const [sessionId, docKey] = kyc.document_url.split(":::");
        if (sessionId) diditSessionIds.push(sessionId);
        if (docKey) extraS3Keys.push(docKey);
      } else {
        extraS3Keys.push(kyc.document_url);
      }
    }

    const deletableCauseIds: string[] = [];
    const historicalFundedCauseIds: string[] = [];

    for (const cause of userCauses) {
      const hasFinancialHistory =
        Number(cause.raised ?? 0) > 0 ||
        cause._count.donations > 0 ||
        cause._count.crypto_donations > 0 ||
        cause._count.pledges > 0 ||
        cause._count.subscriptions > 0;

      if (hasFinancialHistory) {
        historicalFundedCauseIds.push(cause.id);
      } else {
        deletableCauseIds.push(cause.id);
        extraS3Keys.push(cause.image);
        for (const item of cause.multimedia ?? []) {
          extraS3Keys.push(item);
        }
      }
    }

    const petitionIds = userPetitions.map((p) => p.id);
    for (const petition of userPetitions) {
      extraS3Keys.push(petition.image);
      for (const item of petition.multimedia ?? []) {
        extraS3Keys.push(item);
      }
    }

    // 3. Delete external KYC sessions and personal S3 files (best-effort)
    await Promise.allSettled([
      deleteDiditSessions(diditSessionIds),
      deleteUserPersonalS3Files(
        userId,
        extraS3Keys.map((k) => extractS3Key(k)),
      ),
    ]);

    const anonymizedEmail = buildAnonymizedEmail(userId);
    const anonymizedName = DATA_RETENTION_POLICY.DELETED_ACCOUNT_DISPLAY_NAME;

    // 4. Execute atomic DB deletion & financial anonymization
    await prisma.$transaction(async (tx) => {
      // 4a. Anonymize financial records (retained for audit/tax compliance without PII)
      await tx.donation.updateMany({
        where: {
          OR: [{ userId }, { email: user.email }],
        },
        data: {
          userId: null,
          name: anonymizedName,
          email: anonymizedEmail,
          message: null,
          isAnonymous: true,
        },
      });

      await tx.crypto_donations.updateMany({
        where: {
          OR: [{ user_id: userId }, { email: user.email }],
        },
        data: {
          user_id: null,
          name: anonymizedName,
          email: anonymizedEmail,
          message: null,
          donor_wallet_address: null,
        },
      });

      await tx.pledges.updateMany({
        where: {
          OR: [{ user_id: userId }, { email: user.email }],
        },
        data: {
          user_id: null,
          name: anonymizedName,
          email: anonymizedEmail,
          note: null,
          paystack_authorization_code: null,
          paystack_customer_code: null,
          paystack_email_token: null,
        },
      });

      await tx.subscriptions.updateMany({
        where: { user_id: userId },
        data: {
          user_id: null,
          status: "cancelled",
        },
      });

      await tx.donorReferralAttribution.updateMany({
        where: {
          OR: [{ donorUserId: userId }, { donorEmail: user.email }],
        },
        data: {
          donorUserId: null,
          donorEmail: anonymizedEmail,
        },
      });

      // 4b. Delete personal records that do not cascade automatically
      await tx.kyc_verifications.deleteMany({ where: { user_id: userId } });
      await tx.deviceToken.deleteMany({ where: { userId } });
      await tx.user_saved_cards.deleteMany({ where: { user_id: userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.bookmarks.deleteMany({ where: { user_id: userId } });
      await tx.saved_searches.deleteMany({ where: { user_id: userId } });
      await tx.campaign_follows.deleteMany({
        where: { OR: [{ user_id: userId }, { email: user.email }] },
      });
      await tx.cause_shares.deleteMany({ where: { user_id: userId } });
      await tx.userStreak.deleteMany({ where: { userId } });
      await tx.userWallet.deleteMany({ where: { userId } });
      await tx.rewardTransaction.deleteMany({ where: { userId } });
      await tx.eiza_transactions.deleteMany({ where: { user_id: userId } });
      await tx.events.deleteMany({ where: { user_id: userId } });
      await tx.referral.deleteMany({
        where: { OR: [{ referrerId: userId }, { refereeId: userId }] },
      });
      await tx.referrals_v1.deleteMany({
        where: { OR: [{ referrer_id: userId }, { referred_id: userId }] },
      });
      await tx.api_keys.deleteMany({ where: { user_id: userId } });
      await tx.api_webhooks.deleteMany({ where: { user_id: userId } });

      // 4c. Delete comments & petition signatures authored by the user
      await tx.comments.deleteMany({ where: { user_id: userId } });
      await tx.petition_comments.deleteMany({ where: { user_id: userId } });
      await tx.signatures.deleteMany({ where: { user_id: userId } });

      // 4d. Delete cause/petition edit drafts created by the user
      const userCauseEdits = await tx.cause_edits.findMany({
        where: {
          OR: [
            { user_id: userId },
            ...(deletableCauseIds.length > 0
              ? [{ cause_id: { in: deletableCauseIds } }]
              : []),
          ],
        },
        select: { id: true },
      });
      if (userCauseEdits.length > 0) {
        const editIds = userCauseEdits.map((e) => e.id);
        await tx.cause_edit_sections.deleteMany({
          where: { cause_edit_id: { in: editIds } },
        });
        await tx.cause_edits.deleteMany({
          where: { id: { in: editIds } },
        });
      }

      const userPetitionEdits = await tx.petition_edits.findMany({
        where: {
          OR: [
            { user_id: userId },
            ...(petitionIds.length > 0
              ? [{ petition_id: { in: petitionIds } }]
              : []),
          ],
        },
        select: { id: true },
      });
      if (userPetitionEdits.length > 0) {
        const petitionEditIds = userPetitionEdits.map((e) => e.id);
        await tx.petition_edit_sections.deleteMany({
          where: { petition_edit_id: { in: petitionEditIds } },
        });
        await tx.petition_edits.deleteMany({
          where: { id: { in: petitionEditIds } },
        });
      }

      // 4e. Delete user's petitions and their child records
      if (petitionIds.length > 0) {
        await tx.petition_comments.deleteMany({
          where: { petition_id: { in: petitionIds } },
        });
        await tx.petition_sections.deleteMany({
          where: { petition_id: { in: petitionIds } },
        });
        await tx.signatures.deleteMany({
          where: { petition_id: { in: petitionIds } },
        });
        await tx.petitions.deleteMany({
          where: { id: { in: petitionIds } },
        });
      }

      // 4f. Delete unfunded causes and their child records
      if (deletableCauseIds.length > 0) {
        await tx.comments.deleteMany({
          where: { cause_id: { in: deletableCauseIds } },
        });
        await tx.cause_sections.deleteMany({
          where: { cause_id: { in: deletableCauseIds } },
        });
        await tx.campaign_follows.deleteMany({
          where: { cause_id: { in: deletableCauseIds } },
        });
        await tx.cause_shares.deleteMany({
          where: { cause_id: { in: deletableCauseIds } },
        });
        await tx.bookmarks.deleteMany({
          where: { cause_id: { in: deletableCauseIds } },
        });
        await tx.campaign_proof_updates.deleteMany({
          where: { cause_id: { in: deletableCauseIds } },
        });
        await tx.campaign_proof_requirements.deleteMany({
          where: { cause_id: { in: deletableCauseIds } },
        });
        await tx.cause.deleteMany({
          where: { id: { in: deletableCauseIds } },
        });
      }

      // 4g. Delete OAuth accounts, sessions, and roles
      await tx.session.deleteMany({ where: { userId } });
      await tx.account.deleteMany({ where: { userId } });
      await tx.role.deleteMany({ where: { userId } });

      // 4h. If historical funded causes remain, anonymize the profile into an inert
      // tombstone so foreign keys on closed campaigns stay valid while freeing the
      // user's email, phone, and OAuth identity. Otherwise hard-delete the User row.
      if (historicalFundedCauseIds.length > 0) {
        await tx.user.update({
          where: { id: userId },
          data: {
            email: anonymizedEmail,
            fullName: anonymizedName,
            username: null,
            phone: null,
            password: null,
            profilePhoto: null,
            bio: null,
            accountNumber: null,
            accountName: null,
            bankName: null,
            subAccountCode: null,
            solana_wallet: null,
            twitter_url: null,
            facebook_url: null,
            instagram_url: null,
            tiktok_url: null,
            linkedin_url: null,
            referral_code: null,
            referred_by: null,
            isVerified: false,
            isBlocked: true,
            emailNotifications: false,
            pushNotifications: false,
            sessions_invalidated_after: new Date(),
          },
        });
      } else {
        await tx.user.delete({
          where: { id: userId },
        });
      }
    });

    return {
      success: true,
      statusCode: 200,
    };
  } catch (error) {
    console.error("Failed to execute user account deletion:", error);
    return {
      success: false,
      statusCode: 500,
      error: "Failed to delete account. Please try again or contact support.",
      code: "DELETION_FAILED",
    };
  }
}

