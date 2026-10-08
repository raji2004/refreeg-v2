"use server";

import { prisma } from "@/lib/prisma";
import { causePublicPath } from "@/lib/causes/slug";

export type GiftCause = {
  id: string;
  href: string;
  title: string;
  image: string | null;
  raised: number;
  goal: number;
  orgName: string;
  orgVerified: boolean;
};

export type GiftDetails = {
  reference: string;
  amount: number;
  tip: number;
  provider: string;
  paidAt: string;
  donorName: string;
  donorEmail: string;
  anonymous: boolean;
  cause: GiftCause;
  /** Completed gifts to this campaign, including this one. */
  giftCount: number;
  related: GiftCause[];
};

const causeSelect = {
  id: true,
  slug: true,
  title: true,
  image: true,
  raised: true,
  goal: true,
  category: true,
  user: { select: { fullName: true, isVerified: true } },
} as const;

function toGiftCause(c: {
  id: string;
  slug: string | null;
  title: string;
  image: string | null;
  raised: unknown;
  goal: unknown;
  user: { fullName: string | null; isVerified: boolean | null } | null;
}): GiftCause {
  return {
    id: c.id,
    href: causePublicPath(c),
    title: c.title,
    image: c.image,
    raised: Number(c.raised ?? 0),
    goal: Number(c.goal ?? 0),
    orgName: c.user?.fullName || "RefreeG campaign",
    orgVerified: !!c.user?.isVerified,
  };
}

/**
 * A completed gift, looked up by its payment reference. References are long
 * and unguessable, which is what lets guest donors open their own receipt.
 */
export async function getGiftByReference(
  reference: string,
): Promise<GiftDetails | null> {
  if (!reference || reference.length < 8 || reference.length > 200) return null;

  const donation = await prisma.donation.findFirst({
    where: { paystack_reference: reference, status: "completed" },
    select: {
      amount: true,
      tip_amount: true,
      payment_provider: true,
      createdAt: true,
      name: true,
      email: true,
      is_anonymous: true,
      cause: { select: causeSelect },
    },
  });
  if (!donation) return null;

  const [giftCount, related] = await Promise.all([
    prisma.donation.count({
      where: { causeId: donation.cause.id, status: "completed" },
    }),
    prisma.cause.findMany({
      where: {
        category: donation.cause.category,
        id: { not: donation.cause.id },
        status: "approved",
        paused: false,
        compliance_paused: false,
      },
      select: causeSelect,
      orderBy: { createdAt: "desc" },
      take: 2,
    }),
  ]);

  return {
    reference,
    amount: Number(donation.amount),
    tip: Number(donation.tip_amount ?? 0),
    provider: donation.payment_provider || "paystack",
    paidAt: (donation.createdAt ?? new Date()).toISOString(),
    donorName: donation.name || "Supporter",
    donorEmail: donation.email,
    anonymous: !!donation.is_anonymous,
    cause: toGiftCause(donation.cause),
    giftCount,
    related: related.map(toGiftCause),
  };
}
