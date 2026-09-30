/**
 * @jest-environment node
 */

jest.mock("@/actions/event-reward-actions", () => ({
  recordEvent: jest.fn(),
  updateUserStreaks: jest.fn(),
}));

jest.mock("@/lib/auth/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    cause: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    passwordResetToken: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password-123"),
  compare: jest.fn(),
}));

jest.mock("@/services/mail", () => ({
  sendLoginNotificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendWelcomeEmailToUser: jest.fn(),
}));

jest.mock("@/services/convertkit", () => ({
  subscribeToConvertKit: jest.fn(),
}));

import {
  checkCauseUserLoginAction,
  requestPasswordResetAction,
  resetPasswordAction,
} from "@/actions/auth-actions";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/services/mail";

const mockPrisma = prisma as unknown as {
  user: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  cause: {
    findFirst: jest.Mock;
    update: jest.Mock;
  };
  passwordResetToken: {
    findUnique: jest.Mock;
    upsert: jest.Mock;
    delete: jest.Mock;
  };
  $transaction: jest.Mock;
};

describe("Cause User Login Flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("checkCauseUserLoginAction", () => {
    it("returns false if user has no cause", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        causes: [],
      });
      mockPrisma.cause.findFirst.mockResolvedValue(null);

      const result = await checkCauseUserLoginAction("test@example.com");
      expect(result.isCauseUserWithoutProfile).toBe(false);
    });

    it("returns false if user has a cause AND has complete profile with password", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        password: "hashed_password",
        firstName: "Jane",
        lastName: "Doe",
        onboarding_completed: true,
        causes: [{ id: "cause-1", title: "Clean Water" }],
      });
      mockPrisma.cause.findFirst.mockResolvedValue(null);

      const result = await checkCauseUserLoginAction("test@example.com");
      expect(result.isCauseUserWithoutProfile).toBe(false);
    });

    it("returns true and issues token if user has a cause but no password", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "creator@example.com",
        password: null, // No password set
        firstName: "John",
        lastName: "Creator",
        onboarding_completed: true,
        causes: [{ id: "cause-1", title: "Solar Power" }],
      });
      mockPrisma.cause.findFirst.mockResolvedValue(null);
      mockPrisma.passwordResetToken.upsert.mockResolvedValue({ id: "token-1" });

      const result = await checkCauseUserLoginAction("creator@example.com");
      expect(result.isCauseUserWithoutProfile).toBe(true);
      expect(result.causeTitle).toBe("Solar Power");
      expect(result.token).toBeDefined();
      expect(mockPrisma.passwordResetToken.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: "creator@example.com" },
        })
      );
    });

    it("returns true if user has a cause but incomplete onboarding", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-2",
        email: "incomplete@example.com",
        password: "existing_password",
        firstName: null,
        lastName: null,
        onboarding_completed: false,
        causes: [{ id: "cause-2", title: "Community Library" }],
      });
      mockPrisma.cause.findFirst.mockResolvedValue(null);
      mockPrisma.passwordResetToken.upsert.mockResolvedValue({ id: "token-2" });

      const result = await checkCauseUserLoginAction("incomplete@example.com");
      expect(result.isCauseUserWithoutProfile).toBe(true);
      expect(result.causeTitle).toBe("Community Library");
      expect(result.token).toBeDefined();
    });

    it("handles recovered cause with recovered_owner_email and creates user if missing", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.cause.findFirst.mockResolvedValue({
        id: "cause-3",
        title: "Recovered Hospital Project",
        userId: "unclaimed-id",
        recovered_owner_email: "recovered@example.com",
      });
      mockPrisma.user.create.mockResolvedValue({
        id: "new-user-id",
        email: "recovered@example.com",
        onboarding_completed: false,
        causes: [],
      });
      mockPrisma.cause.update.mockResolvedValue({});
      mockPrisma.passwordResetToken.upsert.mockResolvedValue({});

      const result = await checkCauseUserLoginAction("recovered@example.com");
      expect(result.isCauseUserWithoutProfile).toBe(true);
      expect(result.causeTitle).toBe("Recovered Hospital Project");
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            email: "recovered@example.com",
            onboarding_completed: false,
          },
        })
      );
      expect(mockPrisma.cause.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "cause-3" },
          data: { userId: "new-user-id" },
        })
      );
    });
  });

  describe("requestPasswordResetAction (cause owners)", () => {
    it("creates a quick profile for a recovered-cause email and sends a cause-profile link", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.cause.findFirst.mockResolvedValue({
        id: "cause-3",
        title: "Recovered Hospital Project",
        userId: "unclaimed-id",
        recovered_owner_email: "recovered@example.com",
      });
      mockPrisma.user.create.mockResolvedValue({
        id: "new-user-id",
        email: "recovered@example.com",
        causes: [],
      });
      mockPrisma.cause.update.mockResolvedValue({});
      mockPrisma.passwordResetToken.upsert.mockResolvedValue({});

      const result = await requestPasswordResetAction("  Recovered@Example.com ");

      expect(result).toEqual({ success: true });
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { email: "recovered@example.com", onboarding_completed: false },
        })
      );
      expect(mockPrisma.cause.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "cause-3" },
          data: { userId: "new-user-id" },
        })
      );
      const { resetUrl, email } = (sendPasswordResetEmail as jest.Mock).mock
        .calls[0][0];
      expect(email).toBe("recovered@example.com");
      expect(resetUrl).toContain("/auth/update-password?token=");
      expect(resetUrl).toContain("flow=cause-profile");
      expect(resetUrl).toContain("email=recovered%40example.com");
    });

    it("sends a cause-profile link to an existing cause owner without a password", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "creator@example.com",
        password: null,
        onboarding_completed: true,
        causes: [{ id: "cause-1", title: "Solar Power" }],
      });
      mockPrisma.cause.findFirst.mockResolvedValue(null);
      mockPrisma.passwordResetToken.upsert.mockResolvedValue({});

      const result = await requestPasswordResetAction("creator@example.com");

      expect(result).toEqual({ success: true });
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
      expect(sendPasswordResetEmail).toHaveBeenCalledWith({
        email: "creator@example.com",
        resetUrl: expect.stringContaining("flow=cause-profile"),
      });
    });

    it("uses the plain reset link for a cause owner with a complete profile", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "done@example.com",
        password: "hash",
        firstName: "Jane",
        lastName: "Doe",
        onboarding_completed: true,
        causes: [{ id: "cause-1", title: "Clean Water" }],
      });
      mockPrisma.cause.findFirst.mockResolvedValue(null);
      mockPrisma.passwordResetToken.upsert.mockResolvedValue({});

      const result = await requestPasswordResetAction("done@example.com");

      expect(result).toEqual({ success: true });
      const { resetUrl } = (sendPasswordResetEmail as jest.Mock).mock
        .calls[0][0];
      expect(resetUrl).not.toContain("flow=cause-profile");
    });

    it("still errors when the email has no user and no cause", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.cause.findFirst.mockResolvedValue(null);

      const result = await requestPasswordResetAction("nobody@example.com");

      expect(result.success).toBe(false);
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe("resetPasswordAction", () => {
    it("updates password, deletes token, and returns user email", async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
        id: "token-id-1",
        email: "user@example.com",
        token: "valid-token",
        expires: new Date(Date.now() + 100000),
      });
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await resetPasswordAction("valid-token", "NewSecurePassword123!");
      expect(result.success).toBe(true);
      expect(result.email).toBe("user@example.com");
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });
});
