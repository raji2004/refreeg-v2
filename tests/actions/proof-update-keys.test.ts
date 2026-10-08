/**
 * @jest-environment node
 */
jest.mock("@/lib/auth/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/actions/role-actions", () => ({
  isAdminOrManager: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    cause: { findUnique: jest.fn() },
    cause_proof_updates: { create: jest.fn() },
  },
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { submitProofUpdate } from "@/actions/proof-update-actions";

const form = (media: string) => {
  const fd = new FormData();
  fd.append("causeId", "cause-1");
  fd.append("description", "Bought school supplies for the whole class.");
  fd.append("media", media);
  return fd;
};

describe("submitProofUpdate with pre-uploaded keys", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.cause.findUnique as jest.Mock).mockResolvedValue({
      id: "cause-1",
      userId: "user-1",
      title: "School supplies",
    });
  });

  it("rejects a key from another user's folder", async () => {
    const result = await submitProofUpdate(
      form(
        JSON.stringify({
          key: "uploads/causes/user-2/cause-1/images/x.jpg",
          name: "x.jpg",
        }),
      ),
    );
    expect(result).toEqual({ success: false, error: "Invalid upload." });
  });

  it("rejects a key for a different cause", async () => {
    const result = await submitProofUpdate(
      form(
        JSON.stringify({
          key: "uploads/causes/user-1/cause-9/images/x.jpg",
          name: "x.jpg",
        }),
      ),
    );
    expect(result).toEqual({ success: false, error: "Invalid upload." });
  });

  it("rejects a value that isn't an upload descriptor", async () => {
    const result = await submitProofUpdate(form("not json"));
    expect(result).toEqual({ success: false, error: "Invalid upload." });
  });
});
