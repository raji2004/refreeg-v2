/**
 * @jest-environment node
 */
jest.mock("@/lib/auth/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: { role: { findFirst: jest.fn() } },
}));

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { requireSelfOrStaff } from "@/lib/auth/admin-auth";

const mockAuth = auth as unknown as jest.Mock;
const mockRole = (prisma as any).role.findFirst as jest.Mock;

describe("requireSelfOrStaff", () => {
  beforeEach(() => jest.clearAllMocks());

  it("allows users to act on themselves", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    await expect(requireSelfOrStaff("user-1")).resolves.toEqual({
      id: "user-1",
    });
    expect(mockRole).not.toHaveBeenCalled();
  });

  it("rejects acting on another user", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockRole.mockResolvedValue({ role: "user" });

    await expect(requireSelfOrStaff("user-2")).rejects.toThrow(
      "Not authorized",
    );
  });

  it("lets managers and admins act on other users", async () => {
    mockAuth.mockResolvedValue({ user: { id: "staff-1" } });
    mockRole.mockResolvedValue({ role: "manager" });

    await expect(requireSelfOrStaff("user-2")).resolves.toEqual({
      id: "staff-1",
    });
  });

  it("rejects signed-out callers", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(requireSelfOrStaff("user-1")).rejects.toThrow(
      "Not authenticated",
    );
  });
});
