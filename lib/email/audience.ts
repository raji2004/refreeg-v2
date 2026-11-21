import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { EmailAudience } from "@/lib/options/email-audience.options";

/** Prisma's `in` list is capped by the database's bind-variable limit. */
export const MAX_VERIFIED_USERS = 30_000;

const reachable: Prisma.UserWhereInput = {
  email: { not: null },
  OR: [{ isBlocked: false }, { isBlocked: null }],
};

const isCampaignOwner: Prisma.UserWhereInput = {
  causes: { some: { status: "approved" } },
};

async function verifiedUserFilter(): Promise<Prisma.UserWhereInput> {
  const rows = await prisma.kyc_verifications.findMany({
    where: { status: "approved" },
    select: { user_id: true },
    distinct: ["user_id"],
    take: MAX_VERIFIED_USERS + 1,
  });
  if (rows.length > MAX_VERIFIED_USERS) {
    throw new Error(
      `More than ${MAX_VERIFIED_USERS} verified users: pick a smaller audience`,
    );
  }
  return { id: { in: rows.map((row) => row.user_id) } };
}

/** Everyone in the audience who has an email and is not blocked. */
export async function audienceWhere(
  audience: EmailAudience,
): Promise<Prisma.UserWhereInput> {
  switch (audience) {
    case "all_users":
      return reachable;
    case "campaign_owners":
      return { AND: [reachable, isCampaignOwner] };
    case "campaign_owners_verified":
      return {
        AND: [reachable, isCampaignOwner, await verifiedUserFilter()],
      };
    case "donors":
      return {
        AND: [reachable, { donations: { some: { status: "completed" } } }],
      };
    case "verified_users":
      return { AND: [reachable, await verifiedUserFilter()] };
    case "organisations":
      return { AND: [reachable, { accountType: "organization" }] };
  }
}

export async function countAudience(audience: EmailAudience) {
  return prisma.user.count({ where: await audienceWhere(audience) });
}

/** Next page of recipients after `afterId`, in id order so a run can resume. */
export async function getRecipientBatch(
  audience: EmailAudience,
  afterId: string | null,
  take: number,
) {
  const where = await audienceWhere(audience);
  return prisma.user.findMany({
    where: afterId ? { AND: [where, { id: { gt: afterId } }] } : where,
    orderBy: { id: "asc" },
    take,
    select: {
      id: true,
      email: true,
      firstName: true,
      displayName: true,
      fullName: true,
    },
  });
}
