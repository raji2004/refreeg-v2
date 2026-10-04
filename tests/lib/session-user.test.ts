/**
 * @jest-environment node
 */
jest.mock("@/lib/auth/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: jest.fn() } },
}));

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session-user";

const mockAuth = auth as jest.Mock;

describe("getSessionUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the identity from the session without touching the database", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", email: "a@example.com", name: "Ada" },
    });

    const user = await getSessionUser();

    expect(user).toEqual({ id: "user-1", email: "a@example.com", name: "Ada" });
    expect(
      (prisma as unknown as { user: { findUnique: jest.Mock } }).user
        .findUnique,
    ).not.toHaveBeenCalled();
  });

  it("returns null when there is no session", async () => {
    mockAuth.mockResolvedValue(null);

    expect(await getSessionUser()).toBeNull();
  });

  it("returns null when the session has no user id", async () => {
    mockAuth.mockResolvedValue({ user: { email: "a@example.com" } });

    expect(await getSessionUser()).toBeNull();
  });

  it("normalises missing email and name to null", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    expect(await getSessionUser()).toEqual({
      id: "user-1",
      email: null,
      name: null,
    });
  });
});
