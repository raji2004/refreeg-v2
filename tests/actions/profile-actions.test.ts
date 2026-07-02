/**
 * @jest-environment node
 */
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    kyc_verifications: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/s3/s3-utils", () => ({
  uploadToS3: jest.fn(),
  generateS3Key: jest.fn(() => "profiles/user-1/photo.jpg"),
}));

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  getProfile,
  hasBankDetails,
  updateProfile,
  checkUsernameAvailability,
  isProfileComplete,
  hasCompletedOnboarding,
  getCurrentOnboardingStep,
  getSolanaWallet,
  updateSolanaWallet,
} from "@/actions/profile-actions";

const mockPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock; update: jest.Mock };
  kyc_verifications: { findFirst: jest.Mock; update: jest.Mock };
};

const baseUser = {
  id: "user-1",
  email: "user@test.com",
  fullName: "Test User",
  firstName: "Test",
  lastName: "User",
  username: "testuser",
  phone: "08012345678",
  location: "Lagos",
  accountNumber: "1234567890",
  bankName: "Test Bank",
  accountName: "Test User",
  subAccountCode: "SUB_123",
  profilePhoto: "profiles/user-1/photo.jpg",
  isBlocked: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  accountType: "individual",
  isVerified: true,
  gender: "male",
  bio: "Hello",
  solana_wallet: "sol-wallet",
  twitter_url: null,
  facebook_url: null,
  instagram_url: null,
  linkedin_url: null,
};

describe("profile-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getProfile", () => {
    it("returns mapped profile when user exists", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);

      const result = await getProfile("user-1");

      expect(result).toMatchObject({
        id: "user-1",
        email: "user@test.com",
        full_name: "Test User",
        username: "testuser",
      });
    });

    it("returns null when user does not exist", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await getProfile("missing");

      expect(result).toBeNull();
    });
  });

  describe("hasBankDetails", () => {
    it("returns true when account number and bank name are set", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);

      const result = await hasBankDetails("user-1");

      expect(result).toBe(true);
    });

    it("returns false when bank details are missing", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        accountNumber: null,
        bankName: null,
      });

      const result = await hasBankDetails("user-1");

      expect(result).toBe(false);
    });
  });

  describe("updateProfile", () => {
    it("updates profile and revalidates paths", async () => {
      mockPrisma.user.update.mockResolvedValue(baseUser);

      const result = await updateProfile("user-1", {
        name: "Test User",
        email: "user@test.com",
        username: "testuser",
        phone: "08012345678",
        bio: "Hello",
        account_type: "individual",
        profile_photo: "profiles/user-1/photo.jpg",
      });

      expect(result.full_name).toBe("Test User");
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/settings");
      expect(revalidatePath).toHaveBeenCalledWith("/profile/user-1");
    });
  });

  describe("checkUsernameAvailability", () => {
    it("returns true when username is available", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await checkUsernameAvailability("newuser");

      expect(result).toBe(true);
    });

    it("returns false when username is taken", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "other-user" });

      const result = await checkUsernameAvailability("testuser");

      expect(result).toBe(false);
    });
  });

  describe("isProfileComplete", () => {
    it("returns complete when full name and photo exist", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        fullName: "Test User",
        profilePhoto: "photo.jpg",
      });

      const result = await isProfileComplete("user-1");

      expect(result).toEqual({ isComplete: true, missingFields: [] });
    });

    it("returns missing fields when profile is incomplete", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        fullName: "",
        profilePhoto: null,
      });

      const result = await isProfileComplete("user-1");

      expect(result.isComplete).toBe(false);
      expect(result.missingFields).toEqual(
        expect.arrayContaining(["full name", "profile picture"]),
      );
    });
  });

  describe("hasCompletedOnboarding", () => {
    it("returns true when all onboarding fields are present", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        fullName: "Test User",
        phone: "08012345678",
        email: "user@test.com",
        firstName: "Test",
        lastName: "User",
        username: "testuser",
        location: "Lagos",
        createdAt: new Date("2026-01-01"),
      });

      const result = await hasCompletedOnboarding("user-1");

      expect(result).toBe(true);
    });

    it("returns false when profile does not exist", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await hasCompletedOnboarding("user-1");

      expect(result).toBe(false);
    });
  });

  describe("getCurrentOnboardingStep", () => {
    it("returns step 1 when account type is missing", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        accountType: null,
        gender: null,
        firstName: null,
        lastName: null,
        username: null,
        location: null,
        phone: null,
        email: null,
        profilePhoto: null,
      });

      const result = await getCurrentOnboardingStep("user-1");

      expect(result).toBe(1);
    });

    it("returns step 4 when all onboarding data is complete", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        accountType: "individual",
        gender: "male",
        firstName: "Test",
        lastName: "User",
        username: "testuser",
        location: "Lagos",
        phone: "08012345678",
        email: "user@test.com",
        profilePhoto: "photo.jpg",
      });

      const result = await getCurrentOnboardingStep("user-1");

      expect(result).toBe(4);
    });
  });

  describe("getSolanaWallet / updateSolanaWallet", () => {
    it("returns solana wallet from profile", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        solana_wallet: "sol-wallet-123",
      });

      const result = await getSolanaWallet("user-1");

      expect(result).toBe("sol-wallet-123");
    });

    it("updates solana wallet and revalidates settings", async () => {
      mockPrisma.user.update.mockResolvedValue({
        solana_wallet: "new-sol-wallet",
      });

      const result = await updateSolanaWallet("user-1", "new-sol-wallet");

      expect(result).toBe("new-sol-wallet");
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/settings");
    });
  });
});
