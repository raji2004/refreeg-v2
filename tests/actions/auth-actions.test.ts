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
    userWallet: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    userStreak: { create: jest.fn() },
    rewardTransaction: {
      findFirst: jest.fn(),
      create: jest.fn(),
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
  hash: jest.fn(),
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
  recordEvent,
  updateUserStreaks,
} from "@/actions/event-reward-actions";
import {
  getCurrentUser,
  signUpAction,
  trackLogin,
  initializeUserWallet,
  recordSignupReward,
  requestPasswordResetAction,
  resetPasswordAction,
} from "@/actions/auth-actions";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  sendPasswordResetEmail,
  sendWelcomeEmailToUser,
} from "@/services/mail";
import { subscribeToConvertKit } from "@/services/convertkit";

const mockAuth = auth as jest.Mock;
const mockPrisma = prisma as unknown as {
  user: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  userWallet: {
    findUnique: jest.Mock;
    create: jest.Mock;
    upsert: jest.Mock;
  };
  userStreak: { create: jest.Mock };
  rewardTransaction: {
    findFirst: jest.Mock;
    create: jest.Mock;
  };
  passwordResetToken: {
    findUnique: jest.Mock;
    upsert: jest.Mock;
    delete: jest.Mock;
  };
  $transaction: jest.Mock;
};
const mockRecordEvent = recordEvent as jest.Mock;
const mockUpdateUserStreaks = updateUserStreaks as jest.Mock;
const mockBcryptHash = bcrypt.hash as jest.Mock;

describe("auth-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    process.env.AUTH_URL = "http://localhost:3000/api/auth";
  });

  describe("getCurrentUser", () => {
    it("returns null when there is no session", async () => {
      mockAuth.mockResolvedValue(null);

      const result = await getCurrentUser();

      expect(result).toBeNull();
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("returns the user when session is valid", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-1" } });
      const user = { id: "user-1", email: "test@example.com" };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await getCurrentUser();

      expect(result).toEqual(user);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
      });
    });
  });

  describe("signUpAction", () => {
    it("returns error when email already exists", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "existing" });

      const result = await signUpAction(
        "test@example.com",
        "password123",
        "Test User",
      );

      expect(result).toEqual({
        success: false,
        error: "A user with that email already exists.",
      });
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it("creates a new user on success", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockBcryptHash.mockResolvedValue("hashed-password");
      mockPrisma.user.create.mockResolvedValue({ id: "user-1" });
      (subscribeToConvertKit as jest.Mock).mockResolvedValue(undefined);
      (sendWelcomeEmailToUser as jest.Mock).mockResolvedValue(undefined);

      const result = await signUpAction(
        "new@example.com",
        "password123",
        "New User",
        "individual",
      );

      expect(result).toEqual({ success: true });
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: "new@example.com",
          password: "hashed-password",
          fullName: "New User",
          accountType: "individual",
        },
      });
    });
  });

  describe("trackLogin", () => {
    it("records login event and updates streaks", async () => {
      mockRecordEvent.mockResolvedValue(undefined);
      mockUpdateUserStreaks.mockResolvedValue(undefined);

      await trackLogin("user-1");

      expect(mockRecordEvent).toHaveBeenCalledWith({
        type: "login",
        userId: "user-1",
        metadata: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });
      expect(mockUpdateUserStreaks).toHaveBeenCalledWith("user-1");
    });
  });

  describe("initializeUserWallet", () => {
    it("returns existing wallet when already initialized", async () => {
      const existing = { id: "wallet-1" };
      mockPrisma.userWallet.findUnique.mockResolvedValue(existing);

      const result = await initializeUserWallet("user-1");

      expect(result).toEqual(existing);
      expect(mockPrisma.userWallet.create).not.toHaveBeenCalled();
    });

    it("creates wallet and streak for new user", async () => {
      mockPrisma.userWallet.findUnique.mockResolvedValue(null);
      const newWallet = { id: "wallet-2", balance: 5 };
      mockPrisma.userWallet.create.mockResolvedValue(newWallet);
      mockPrisma.userStreak.create.mockResolvedValue({ id: "streak-1" });

      const result = await initializeUserWallet("user-1", 5);

      expect(result).toEqual(newWallet);
      expect(mockPrisma.userStreak.create).toHaveBeenCalled();
    });
  });

  describe("recordSignupReward", () => {
    it("returns existing reward when already recorded", async () => {
      const existing = { id: "reward-1" };
      mockPrisma.rewardTransaction.findFirst.mockResolvedValue(existing);

      const result = await recordSignupReward("user-1");

      expect(result).toEqual(existing);
      expect(mockPrisma.rewardTransaction.create).not.toHaveBeenCalled();
    });

    it("creates reward and updates wallet balance", async () => {
      mockPrisma.rewardTransaction.findFirst.mockResolvedValue(null);
      mockPrisma.rewardTransaction.create.mockResolvedValue({ id: "reward-2" });
      mockPrisma.userWallet.findUnique.mockResolvedValue({ balance: 0 });
      mockPrisma.userWallet.upsert.mockResolvedValue({ balance: 1 });

      const result = await recordSignupReward("user-1", 1);

      expect(result).toEqual({ id: "reward-2" });
      expect(mockPrisma.userWallet.upsert).toHaveBeenCalled();
    });
  });

  describe("requestPasswordResetAction", () => {
    it("returns error when user is not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await requestPasswordResetAction("missing@example.com");

      expect(result).toEqual({
        success: false,
        error: "No account found with this email address.",
      });
    });

    it("stores token and sends reset email on success", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "user-1" });
      (mockPrisma.passwordResetToken.upsert as jest.Mock).mockResolvedValue(
        {},
      );
      (sendPasswordResetEmail as jest.Mock).mockResolvedValue(undefined);

      const result = await requestPasswordResetAction("test@example.com");

      expect(result).toEqual({ success: true });
      expect(sendPasswordResetEmail).toHaveBeenCalledWith({
        email: "test@example.com",
        resetUrl: expect.stringContaining("/auth/update-password?token="),
      });
    });
  });

  describe("resetPasswordAction", () => {
    it("returns error for invalid or expired token", async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(null);

      const result = await resetPasswordAction("bad-token", "newpass");

      expect(result).toEqual({
        success: false,
        error: "Invalid or expired token",
      });
    });

    it("resets password when token is valid", async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
        id: "token-1",
        email: "test@example.com",
        expires: new Date(Date.now() + 3600000),
      });
      mockBcryptHash.mockResolvedValue("new-hash");
      mockPrisma.$transaction.mockResolvedValue([]);

      const result = await resetPasswordAction("valid-token", "newpass");

      expect(result).toEqual({ success: true });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });
});
