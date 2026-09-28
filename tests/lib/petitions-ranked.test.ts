/**
 * @jest-environment node
 */
jest.mock("@/actions/petition-actions", () => ({
  listPetitions: jest.fn(),
}));

jest.mock("@/actions/signature-actions", () => ({
  getPetitionSignatureTotals: jest.fn(),
}));

import { getRankedPetitions } from "@/lib/petitions-ranked";
import { listPetitions } from "@/actions/petition-actions";
import { getPetitionSignatureTotals } from "@/actions/signature-actions";

const mockList = listPetitions as jest.Mock;
const mockTotals = getPetitionSignatureTotals as jest.Mock;

const petition = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  title: id,
  goal: 100,
  days_active: 10,
  status: "approved",
  image: null,
  created_at: "2024-01-01T00:00:00.000Z",
  user: { email: "owner@example.com", fullName: "Owner" },
  profiles: {
    full_name: "Owner",
    email: "owner@example.com",
    profile_photo: null,
    is_verified: true,
  },
  ...overrides,
});

describe("getRankedPetitions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("ranks by percent raised, then signers, with zero-raised petitions last", async () => {
    mockList.mockResolvedValue([
      petition("none"),
      petition("half"),
      petition("full"),
    ]);
    mockTotals.mockResolvedValue({
      half: { signerCount: 5, totalAmount: 50 },
      full: { signerCount: 2, totalAmount: 100 },
    });

    const ranked = await getRankedPetitions("all");

    expect(ranked.map((p) => p.id)).toEqual(["full", "half", "none"]);
    expect(ranked[0].percentRaised).toBe(100);
    expect(ranked[2]).toMatchObject({ signerCount: 0, totalAmount: 0 });
  });

  it("drops inactive and expired petitions before asking for totals", async () => {
    mockList.mockResolvedValue([
      petition("live"),
      petition("no-days", { days_active: 0 }),
      petition("expired", { status: "expired" }),
    ]);
    mockTotals.mockResolvedValue({});

    const ranked = await getRankedPetitions("all");

    expect(ranked.map((p) => p.id)).toEqual(["live"]);
    expect(mockTotals).toHaveBeenCalledWith(["live"]);
  });

  it("passes the category through to the query", async () => {
    mockList.mockResolvedValue([]);
    mockTotals.mockResolvedValue({});

    await getRankedPetitions("health");

    expect(mockList).toHaveBeenCalledWith({ category: "health" });
  });

  it("does not expose the owner's email", async () => {
    mockList.mockResolvedValue([petition("a")]);
    mockTotals.mockResolvedValue({});

    const [ranked] = await getRankedPetitions("all");

    expect(ranked).not.toHaveProperty("user");
    expect(ranked.profiles?.email).toBe("");
    expect(ranked.profiles?.full_name).toBe("Owner");
    expect(JSON.stringify(ranked)).not.toContain("owner@example.com");
  });
});
