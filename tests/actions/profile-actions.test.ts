/**
 * @jest-environment node
 */
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    organization: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    organizationMember: {
      create: jest.fn(),
    },
    kyc_verifications: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    donation: { count: jest.fn(), groupBy: jest.fn().mockResolvedValue([]) },
  },
}));

jest.mock("@/lib/auth/auth", () => ({
  auth: jest.fn(),
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
  createOnboardingProfile,
  saveStep1Progress,
  completeOnboarding,
} from "@/actions/profile-actions";

const mockPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock; update: jest.Mock };
  organization: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
  organizationMember: { create: jest.Mock };
  kyc_verifications: { findFirst: jest.Mock; update: jest.Mock };
  donation: { count: jest.Mock; groupBy: jest.Mock };
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

    it("counts donations with an indexed per-user query, not a _count include", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      mockPrisma.donation.groupBy.mockResolvedValue([
        { causeId: "c1" },
        { causeId: "c2" },
        { causeId: "c3" },
        { causeId: "c4" },
      ]);

      const result = await getProfile("user-1");

      expect(result?.causes_count).toBe(4);
      expect(mockPrisma.donation.groupBy).toHaveBeenCalledWith({
        by: ["causeId"],
        where: { userId: "user-1", status: "successful" },
      });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
        omit: { password: true },
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
    it("returns true when onboarding_completed is true", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        fullName: "Test User",
        phone: "08012345678",
        email: "user@test.com",
        firstName: "Test",
        lastName: "User",
        username: "testuser",
        location: "Lagos",
        createdAt: new Date("2026-01-01"),
        onboarding_completed: true,
      });

      const result = await hasCompletedOnboarding("user-1");

      expect(result).toBe(true);
    });

    it("returns false when onboarding_completed is false for a recent account", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        fullName: "Test User",
        phone: "08012345678",
        email: "user@test.com",
        firstName: "Test",
        lastName: "User",
        username: "testuser",
        location: "Lagos",
        createdAt: new Date("2026-01-01"),
        onboarding_completed: false,
      });

      const result = await hasCompletedOnboarding("user-1");

      expect(result).toBe(false);
    });

    it("returns true for legacy accounts predating the onboarding wizard", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        fullName: "Test User",
        phone: "08012345678",
        email: "user@test.com",
        firstName: "Test",
        lastName: "User",
        username: "testuser",
        location: "Lagos",
        createdAt: new Date("2024-01-01"),
        onboarding_completed: false,
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

  describe("onboarding refactoring (unified account type + profile)", () => {
    it("allows switching accountType from individual to organization in saveStep1Progress", async () => {
      mockPrisma.user.update.mockResolvedValue({
        ...baseUser,
        accountType: "organization",
      });

      await saveStep1Progress("user-1", "organization");

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { accountType: "organization" },
      });
    });

    it("splits fullName, formats location, and auto-generates username in createOnboardingProfile", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        profilePhoto: null,
        accountType: "individual",
        email: "amina@example.com",
        username: null,
        onboarding_completed: false,
      });
      mockPrisma.user.update.mockResolvedValue(baseUser);

      await createOnboardingProfile("user-1", {
        fullName: "Amina Bello",
        displayName: "Amina B.",
        dateOfBirth: "15/06/1995",
        gender: "female",
        state: "Lagos",
        city: "Yaba",
        accountType: "individual",
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
          data: expect.objectContaining({
            fullName: "Amina Bello",
            firstName: "Amina",
            lastName: "Bello",
            displayName: "Amina B.",
            gender: "female",
            location: "Yaba, Lagos",
            accountType: "individual",
            username: expect.stringMatching(/^amina_bello_\d{3}$/),
          }),
        }),
      );
    });

    it("rejects under-18 date of birth in createOnboardingProfile", async () => {
      await expect(
        createOnboardingProfile("user-1", {
          fullName: "Young User",
          dateOfBirth: "01/01/2015",
          accountType: "individual",
        }),
      ).rejects.toThrow("You need to be 18 or over to use RefreeG.");
    });

    it("creates Organization and OrganizationMember when organization is selected in createOnboardingProfile", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        profilePhoto: null,
        accountType: "individual",
        email: "lead@lagostrust.org",
        username: null,
        onboarding_completed: false,
      });
      mockPrisma.user.update.mockResolvedValue({
        ...baseUser,
        accountType: "organization",
      });
      mockPrisma.organization.findFirst.mockResolvedValue(null);
      mockPrisma.organization.create.mockResolvedValue({
        id: "org-1",
        name: "Lagos Education Trust",
      });

      await createOnboardingProfile("user-1", {
        fullName: "Chidi Okonkwo",
        state: "Lagos",
        city: "Yaba",
        accountType: "organization",
        organizationName: "Lagos Education Trust",
        organizationType: "Registered NGO",
        organizationRole: "Programme lead",
      });

      expect(mockPrisma.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Lagos Education Trust",
            industry: "Registered NGO",
            address: "Yaba, Lagos",
            ownerId: "user-1",
            preferences: expect.objectContaining({
              ownerRole: "Programme lead",
            }),
          }),
        }),
      );
      expect(mockPrisma.organizationMember.create).toHaveBeenCalledWith({
        data: {
          organizationId: "org-1",
          userId: "user-1",
          role: "owner",
        },
      });
    });

    it("completes onboarding without requiring phone or location, auto-filling username if missing", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        accountType: "individual",
        firstName: "Amina",
        lastName: "Bello",
        fullName: "Amina Bello",
        email: "amina@example.com",
        username: null,
        location: null,
        phone: null,
      });
      mockPrisma.user.update.mockResolvedValue(baseUser);

      await completeOnboarding("user-1");

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: {
          onboarding_completed: true,
          username: expect.stringMatching(/^amina_bello_\d{3}$/),
        },
      });
    });
  });
});
