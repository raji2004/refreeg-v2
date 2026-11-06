/**
 * @jest-environment node
 */
jest.mock("@/lib/prisma", () => ({
  prisma: {
    donation: { findFirst: jest.fn(), count: jest.fn() },
    cause: { findMany: jest.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { getGiftByReference } from "@/actions/gift-actions";

const db = prisma as any;

const cause = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  slug: `${id}-slug`,
  title: `Cause ${id}`,
  image: null,
  raised: 9_500_000,
  goal: 12_000_000,
  category: "health",
  user: { fullName: "Africa Renews", isVerified: true },
  ...extra,
});

describe("getGiftByReference", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects missing or malformed references without querying", async () => {
    await expect(getGiftByReference("")).resolves.toBeNull();
    await expect(getGiftByReference("short")).resolves.toBeNull();
    expect(db.donation.findFirst).not.toHaveBeenCalled();
  });

  it("returns null when no completed gift has that reference", async () => {
    db.donation.findFirst.mockResolvedValue(null);
    await expect(getGiftByReference("ref_1234567890")).resolves.toBeNull();
    expect(db.donation.findFirst.mock.calls[0][0].where).toEqual({
      paystack_reference: "ref_1234567890",
      status: "completed",
    });
  });

  it("maps the gift, counts givers, and finds related campaigns", async () => {
    db.donation.findFirst.mockResolvedValue({
      amount: 5000,
      tip_amount: 0,
      payment_provider: "paystack",
      createdAt: new Date("2026-10-05T10:12:00Z"),
      name: "Amara",
      email: "amara@example.com",
      is_anonymous: false,
      cause: cause("c1"),
    });
    db.donation.count.mockResolvedValue(403);
    db.cause.findMany.mockResolvedValue([cause("c2", { raised: 1_400_000 })]);

    const gift = await getGiftByReference("ref_1234567890");

    expect(gift).toMatchObject({
      amount: 5000,
      provider: "paystack",
      giftCount: 403,
      cause: {
        href: "/causes/c1-slug",
        orgName: "Africa Renews",
        orgVerified: true,
        raised: 9_500_000,
      },
      related: [{ id: "c2", raised: 1_400_000 }],
    });
    expect(db.cause.findMany.mock.calls[0][0].where).toMatchObject({
      category: "health",
      id: { not: "c1" },
      status: "approved",
    });
  });
});
