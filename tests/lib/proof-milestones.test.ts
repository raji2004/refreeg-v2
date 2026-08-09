/**
 * @jest-environment node
 */
import {
  syncMilestoneRequirements,
  assertCauseAcceptingDonations,
} from "@/lib/proof-milestones";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    cause: { findUnique: jest.fn() },
    campaign_proof_requirements: { createMany: jest.fn() },
  },
}));

// Mock Mail
jest.mock("@/services/mail", () => ({
  sendProofUpdateRequiredEmail: jest.fn(),
}));

import { prisma } from "@/lib/prisma";
import { sendProofUpdateRequiredEmail } from "@/services/mail";

const mockPrisma = prisma as any;
const mockMail = sendProofUpdateRequiredEmail as jest.Mock;

describe("syncMilestoneRequirements", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates requirements for newly crossed thresholds (e.g., 25% and 50%)", async () => {
    mockPrisma.cause.findUnique.mockResolvedValue({
      id: "cause-1",
      userId: "user-1",
      title: "Test Cause",
      raised: 5000,
      goal: 10000,
      user: { email: "creator@test.com", fullName: "Creator" },
    });
    // Simulate that both 25% and 50% were just created
    mockPrisma.campaign_proof_requirements.createMany.mockResolvedValue({
      count: 2,
    });

    await syncMilestoneRequirements("cause-1");

    expect(
      mockPrisma.campaign_proof_requirements.createMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ milestone: 25, cause_id: "cause-1" }),
          expect.objectContaining({ milestone: 50, cause_id: "cause-1" }),
        ]),
        skipDuplicates: true,
      }),
    );
    expect(mockMail).toHaveBeenCalledTimes(1);
  });

  it("does nothing and sends no email if goal is 0 or missing", async () => {
    mockPrisma.cause.findUnique.mockResolvedValue({
      id: "cause-1",
      userId: "user-1",
      title: "Test",
      raised: 5000,
      goal: 0,
      user: { email: "creator@test.com", fullName: "Creator" },
    });

    await syncMilestoneRequirements("cause-1");

    expect(
      mockPrisma.campaign_proof_requirements.createMany,
    ).not.toHaveBeenCalled();
    expect(mockMail).not.toHaveBeenCalled();
  });

  it("is idempotent: does not send email if no NEW requirements were created", async () => {
    mockPrisma.cause.findUnique.mockResolvedValue({
      id: "cause-1",
      userId: "user-1",
      title: "Test",
      raised: 5000,
      goal: 10000,
      user: { email: "creator@test.com", fullName: "Creator" },
    });
    // Simulate that the DB ignored the insert because they already existed (skipDuplicates)
    mockPrisma.campaign_proof_requirements.createMany.mockResolvedValue({
      count: 0,
    });

    await syncMilestoneRequirements("cause-1");

    expect(mockMail).not.toHaveBeenCalled();
  });
});

describe("assertCauseAcceptingDonations", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws an error if the cause is compliance_paused", async () => {
    mockPrisma.cause.findUnique.mockResolvedValue({ compliance_paused: true });

    await expect(assertCauseAcceptingDonations("cause-1")).rejects.toThrow(
      "This campaign is not currently accepting donations.",
    );
  });

  it("passes silently if the cause is not paused", async () => {
    mockPrisma.cause.findUnique.mockResolvedValue({ compliance_paused: false });

    await expect(
      assertCauseAcceptingDonations("cause-1"),
    ).resolves.not.toThrow();
  });
});
