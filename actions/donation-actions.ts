"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { Donation, DonationWithCause, DonationFormData } from "@/types";
import { recordEvent } from "@/actions/event-reward-actions";
import { sendDonationReceivedEmail } from "@/services/mail";

const mapPrismaToDonation = (d: any): Donation => ({
  ...d,
  amount: Number(d.amount),
  tip_amount: d.tip_amount ? Number(d.tip_amount) : 0,
  created_at: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
});

export async function createDonation(
  causeId: string,
  userId: string | null,
  donationData: DonationFormData,
  tipAmount: number = 0,
): Promise<Donation> {
  const donationAmount =
    typeof donationData.amount === "string"
      ? Number.parseFloat(donationData.amount)
      : donationData.amount;

  const finalTipAmount =
    tipAmount > 0 ? tipAmount : donationData.tip_amount || 0;

  let data;
  try {
    data = await prisma.donation.create({
      data: {
        causeId: causeId,
        ...(userId ? { userId: userId } : {}),
        amount: donationAmount,
        tip_amount: finalTipAmount,
        name:
          String(donationData.isAnonymous).toLocaleLowerCase() === "true"
            ? "Anonymous"
            : donationData.name,
        email: donationData.email,
        message: donationData.message || null,
        is_anonymous: donationData.isAnonymous,
        status: "completed",
      },
    });
  } catch (error) {
    console.error("Error creating donation:", error);
    throw error;
  }

  // Record event for reward tracking (only if user is logged in)
  if (userId) {
    try {
      await recordEvent({
        type: "donation",
        userId,
        amount: donationAmount,
        metadata: {
          cause_id: causeId,
          donation_id: data.id,
          is_anonymous: donationData.isAnonymous,
        },
      });
    } catch (eventError) {
      console.error("Error recording donation event:", eventError);
      // Don't throw - event tracking shouldn't break the main action
    }
  }

  // Emit SSE event
  try {
    const { eventBus } = await import("@/lib/event-bus");
    eventBus.emit("donation", {
      type: "donation",
      data: mapPrismaToDonation(data),
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Error emitting fiat donation SSE:", e);
  }

  // Auto-fulfill any pending pledge from the same donor for this cause
  if (donationData.email) {
    try {
      await prisma.pledges.updateMany({
        where: {
          cause_id: causeId,
          email: donationData.email,
          status: "pending",
        },
        data: { status: "fulfilled" },
      });
    } catch (pledgeError) {
      console.error("Error fulfilling pledge:", pledgeError);
      // Non-fatal — don't break the donation flow
    }
  }

  // Milestone notifications for followers (50% and 100%)
  try {
    const cause = await prisma.cause.findUnique({
      where: { id: causeId },
      select: { title: true, raised: true, goal: true },
    });

    if (cause) {
      const raisedAfter = Number(cause.raised);
      const raisedBefore = raisedAfter - donationAmount;
      const goal = Number(cause.goal);

      if (goal > 0) {
        const percentBefore = (raisedBefore / goal) * 100;
        const percentAfter = (raisedAfter / goal) * 100;

        let milestoneReached: 50 | 100 | null = null;
        if (percentBefore < 50 && percentAfter >= 50 && percentAfter < 100) {
          milestoneReached = 50;
        } else if (percentBefore < 100 && percentAfter >= 100) {
          milestoneReached = 100;
        }

        if (milestoneReached) {
          // Fetch followers
          const followers = await prisma.campaign_follows.findMany({
            where: { cause_id: causeId },
            select: { email: true },
          });

          if (followers && followers.length > 0) {
            const followerEmails = followers.map((f: any) => f.email);
            const appUrl =
              process.env.NEXT_PUBLIC_APP_URL || "https://www.refreeg.com";

            // Call the follower-update API bridge (fire and forget)
            fetch(`${appUrl}/api/mail/follower-update`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "milestone",
                data: {
                  followers: followerEmails,
                  causeTitle: cause.title,
                  causeUrl: `${appUrl}/causes/${causeId}`,
                  milestone: milestoneReached,
                },
              }),
            }).catch((err) =>
              console.error("Error calling follower-update API:", err),
            );
          }
        }
      }
    }
  } catch (milestoneError) {
    console.error("Error in milestone detection:", milestoneError);
  }

  // Notify the campaign owner about the new donation
  try {
    const causeWithOwner = await prisma.cause.findUnique({
      where: { id: causeId },
      select: {
        title: true,
        raised: true,
        goal: true,
        userId: true,
        user: {
          select: { fullName: true, email: true },
        },
      },
    });

    if (causeWithOwner) {
      const ownerEmail = causeWithOwner.user?.email;
      const ownerName = causeWithOwner.user?.fullName || "Campaign Owner";

      if (ownerEmail) {
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL || "https://www.refreeg.com";
        const donorName =
          String(donationData.isAnonymous).toLowerCase() === "true"
            ? "An anonymous donor"
            : donationData.name || "A donor";

        sendDonationReceivedEmail({
          to: ownerEmail,
          ownerName,
          donorName,
          causeTitle: causeWithOwner.title,
          amount: donationAmount,
          causeUrl: `${appUrl}/causes/${causeId}`,
          amountRaised: Number(causeWithOwner.raised),
          goalAmount: Number(causeWithOwner.goal),
        }).catch((err) =>
          console.error("Error sending donation received email:", err),
        );
      }
    }
  } catch (ownerEmailError) {
    console.error(
      "Error fetching cause owner for donation email:",
      ownerEmailError,
    );
  }

  revalidatePath(`/causes/${causeId}`);
  revalidatePath("/causes");
  revalidatePath("/");
  if (userId) {
    revalidatePath("/dashboard/donations");
  }

  return mapPrismaToDonation(data);
}

export async function listDonationsForCause(
  causeId: string,
): Promise<Donation[]> {
  try {
    const data = await prisma.donation.findMany({
      where: { causeId: causeId },
      orderBy: { createdAt: "desc" },
    });

    return data.map(mapPrismaToDonation);
  } catch (error) {
    console.error("Error listing donations:", error);
    throw error;
  }
}

export async function listUserDonations(
  userId: string,
  timeframe: "all" | "recent" = "all",
): Promise<DonationWithCause[]> {
  try {
    let whereClause: any = { userId: userId };

    if (timeframe === "recent") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      whereClause.createdAt = { gte: thirtyDaysAgo };
    }

    const data = await prisma.donation.findMany({
      where: whereClause,
      include: {
        cause: {
          select: { title: true, category: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return data.map((item: any) => ({
      ...mapPrismaToDonation(item),
      cause: {
        title: item.cause?.title || "Unknown Cause",
        category: item.cause?.category || "Unknown",
      },
    }));
  } catch (error) {
    console.error("Error listing user donations:", error);
    throw error;
  }
}
