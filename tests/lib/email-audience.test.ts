/**
 * @jest-environment node
 */
import { prisma } from "@/lib/prisma";
import {
  audienceWhere,
  countAudience,
  getRecipientBatch,
  MAX_VERIFIED_USERS,
} from "@/lib/email/audience";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { count: jest.fn(), findMany: jest.fn() },
    kyc_verifications: { findMany: jest.fn() },
  },
}));

const db = prisma as unknown as {
  user: { count: jest.Mock; findMany: jest.Mock };
  kyc_verifications: { findMany: jest.Mock };
};

const reachable = {
  email: { not: null },
  OR: [{ isBlocked: false }, { isBlocked: null }],
};

describe("audienceWhere", () => {
  it("all users: anyone with an email who is not blocked", async () => {
    expect(await audienceWhere("all_users")).toEqual(reachable);
  });

  it("never matches blocked users, including a null block flag", async () => {
    const where = await audienceWhere("all_users");
    expect(where.OR).toEqual([{ isBlocked: false }, { isBlocked: null }]);
  });

  it("campaign owners: at least one approved cause", async () => {
    expect(await audienceWhere("campaign_owners")).toEqual({
      AND: [reachable, { causes: { some: { status: "approved" } } }],
    });
  });

  it("donors: at least one completed donation", async () => {
    expect(await audienceWhere("donors")).toEqual({
      AND: [reachable, { donations: { some: { status: "completed" } } }],
    });
  });

  it("organisations: organization account type", async () => {
    expect(await audienceWhere("organisations")).toEqual({
      AND: [reachable, { accountType: "organization" }],
    });
  });

  it("verified users: ids come from approved KYC only", async () => {
    db.kyc_verifications.findMany.mockResolvedValue([
      { user_id: "u1" },
      { user_id: "u2" },
    ]);
    expect(await audienceWhere("verified_users")).toEqual({
      AND: [reachable, { id: { in: ["u1", "u2"] } }],
    });
    expect(db.kyc_verifications.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "approved" },
        distinct: ["user_id"],
      }),
    );
  });

  it("verified campaign owners: owners AND verified", async () => {
    db.kyc_verifications.findMany.mockResolvedValue([{ user_id: "u1" }]);
    expect(await audienceWhere("campaign_owners_verified")).toEqual({
      AND: [
        reachable,
        { causes: { some: { status: "approved" } } },
        { id: { in: ["u1"] } },
      ],
    });
  });

  it("refuses a verified list too large for one query", async () => {
    db.kyc_verifications.findMany.mockResolvedValue(
      Array.from({ length: MAX_VERIFIED_USERS + 1 }, (_, i) => ({
        user_id: `u${i}`,
      })),
    );
    await expect(audienceWhere("verified_users")).rejects.toThrow(
      /More than 30000 verified users/,
    );
  });
});

describe("countAudience", () => {
  it("counts with the audience filter", async () => {
    db.user.count.mockResolvedValue(42);
    expect(await countAudience("all_users")).toBe(42);
    expect(db.user.count).toHaveBeenCalledWith({ where: reachable });
  });
});

describe("getRecipientBatch", () => {
  it("starts from the beginning without a cursor", async () => {
    db.user.findMany.mockResolvedValue([]);
    await getRecipientBatch("all_users", null, 100);
    expect(db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: reachable,
        orderBy: { id: "asc" },
        take: 100,
      }),
    );
  });

  it("continues after the cursor so a resumed run skips finished users", async () => {
    db.user.findMany.mockResolvedValue([]);
    await getRecipientBatch("all_users", "user-9", 50);
    expect(db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [reachable, { id: { gt: "user-9" } }] },
        take: 50,
      }),
    );
  });
});
