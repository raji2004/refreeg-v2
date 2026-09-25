/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { POST } from "@/app/api/cron/proof-enforcement/route";
import { prisma } from "@/lib/prisma";
import {
  sendProofCausePausedEmail,
  sendProofUpdateReminderEmail,
} from "@/services/mail";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    campaign_proof_requirements: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    cause: {
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

jest.mock("@/services/mail", () => ({
  sendProofCausePausedEmail: jest.fn(),
  sendProofUpdateReminderEmail: jest.fn(),
}));

const mockPrisma = prisma as unknown as {
  campaign_proof_requirements: { findMany: jest.Mock; update: jest.Mock };
  cause: { update: jest.Mock; updateMany: jest.Mock };
};

const request = () =>
  new NextRequest("http://localhost/api/cron/proof-enforcement", {
    method: "POST",
  });

const overdue = (id: string, causeId: string, email: string | null) => ({
  id,
  cause: {
    id: causeId,
    title: `Cause ${causeId}`,
    compliance_paused: false,
    user: email ? { email, fullName: "Owner" } : null,
  },
});

describe("proof-enforcement cron", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.CRON_SECRET;
  });

  it("pauses all overdue causes with one updateMany and still emails each owner", async () => {
    mockPrisma.campaign_proof_requirements.findMany
      .mockResolvedValueOnce([
        overdue("r1", "c1", "a@example.com"),
        overdue("r2", "c2", "b@example.com"),
        overdue("r3", "c1", "a@example.com"),
      ])
      .mockResolvedValueOnce([]);

    const res = await POST(request());
    const body = await res.json();

    expect(mockPrisma.cause.update).not.toHaveBeenCalled();
    expect(mockPrisma.cause.updateMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.cause.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["c1", "c2"] } },
      data: expect.objectContaining({ compliance_paused: true }),
    });
    expect(sendProofCausePausedEmail).toHaveBeenCalledTimes(2);
    expect(body).toEqual({ success: true, paused: 2, reminded: 0 });
  });

  it("skips causes that are already paused and never calls updateMany with nothing", async () => {
    mockPrisma.campaign_proof_requirements.findMany
      .mockResolvedValueOnce([
        {
          id: "r1",
          cause: {
            id: "c1",
            title: "Paused",
            compliance_paused: true,
            user: { email: "a@example.com", fullName: "A" },
          },
        },
      ])
      .mockResolvedValueOnce([]);

    const res = await POST(request());

    expect(mockPrisma.cause.updateMany).not.toHaveBeenCalled();
    expect(sendProofCausePausedEmail).not.toHaveBeenCalled();
    expect((await res.json()).paused).toBe(0);
  });

  it("does not email owners without an address but still pauses their cause", async () => {
    mockPrisma.campaign_proof_requirements.findMany
      .mockResolvedValueOnce([overdue("r1", "c1", null)])
      .mockResolvedValueOnce([]);

    const res = await POST(request());

    expect(mockPrisma.cause.updateMany).toHaveBeenCalledTimes(1);
    expect(sendProofCausePausedEmail).not.toHaveBeenCalled();
    expect((await res.json()).paused).toBe(1);
  });

  it("rejects requests with the wrong secret", async () => {
    process.env.CRON_SECRET = "secret";

    const res = await POST(request());

    expect(res.status).toBe(401);
    expect(mockPrisma.cause.updateMany).not.toHaveBeenCalled();
    expect(sendProofUpdateReminderEmail).not.toHaveBeenCalled();
  });
});
