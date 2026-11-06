/**
 * @jest-environment node
 */
jest.mock("@/lib/auth/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { update: jest.fn() },
  },
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import { setProfilePhoto } from "@/actions/profile-actions";

const mockAuth = auth as jest.Mock;
const mockUpdate = prisma.user.update as jest.Mock;

describe("setProfilePhoto", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("saves a key that belongs to the signed-in user", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    const key = "uploads/profiles/user-1/user-1/images/abc_photo.jpg";

    await expect(setProfilePhoto(key)).resolves.toBe(key);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { profilePhoto: key },
    });
  });

  it("rejects a key from another user's folder", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    await expect(
      setProfilePhoto("uploads/profiles/user-2/user-2/images/x.jpg"),
    ).rejects.toThrow("Invalid photo upload.");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rejects when nobody is signed in", async () => {
    mockAuth.mockResolvedValue(null);

    await expect(
      setProfilePhoto("uploads/profiles/user-1/user-1/images/x.jpg"),
    ).rejects.toThrow("You need to be signed in.");
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
