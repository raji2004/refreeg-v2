/**
 * @jest-environment node
 */
jest.mock("@/lib/prisma", () => ({
  prisma: {
    kyc_verifications: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
  },
}));

jest.mock("@/actions/auth-actions", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("@/actions/role-actions", () => ({
  isAdminOrManager: jest.fn(),
}));

jest.mock("@/actions/database-actions", () => ({
  logAdminActivity: jest.fn(),
}));

jest.mock("@/services/mail", () => ({
  sendKycSubmittedEmail: jest.fn(),
  sendKycApprovedEmail: jest.fn(),
  sendKycRejectedEmail: jest.fn(),
  sendKycSubmissionAdminNotification: jest.fn(),
  sendKycReminderEmail: jest.fn(),
}));

jest.mock("@/lib/s3/s3-utils", () => ({
  uploadToS3: jest.fn(),
  generateS3Key: jest.fn(() => "kyc/user-1/doc.pdf"),
}));

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/actions/auth-actions";
import { isAdminOrManager } from "@/actions/role-actions";
import { logAdminActivity } from "@/actions/database-actions";
import {
  sendKycApprovedEmail,
  sendKycReminderEmail,
} from "@/services/mail";
import {
  getVerificationStatus,
  updateVerificationStatus,
  sendKycReminderToUnverifiedUsers,
} from "@/actions/kyc-actions";

const mockPrisma = prisma as unknown as {
  kyc_verifications: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    findMany: jest.Mock;
  };
  user: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
  };
  $queryRaw: jest.Mock;
  $transaction: jest.Mock;
};

const personalData = {
  fullName: "Test User",
  dob: "1990-01-01",
  phone: "08012345678",
  address: "123 Street",
  city: "Lagos",
  state: "LA",
  postal: "100001",
  country: "NG",
};

describe("kyc-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (sendKycReminderEmail as jest.Mock).mockResolvedValue({ success: true });
  });

  // Skipped: uploadKycDocument is not implemented in actions/kyc-actions.ts.
  describe("getVerificationStatus", () => {
    it("returns verification with proxied document URL", async () => {
      mockPrisma.kyc_verifications.findFirst.mockResolvedValue({
        id: "kyc-1",
        user_id: "user-1",
        status: "pending",
        document_url: "kyc/user-1/doc.pdf",
      });

      const result = await getVerificationStatus("user-1");

      expect(result.error).toBeNull();
      expect(result.status?.document_url).toBe(
        "/api/s3/image?key=kyc%2Fuser-1%2Fdoc.pdf",
      );
    });

    it("returns null status when no record exists", async () => {
      mockPrisma.kyc_verifications.findFirst.mockResolvedValue(null);

      const result = await getVerificationStatus("user-1");

      expect(result).toEqual({ status: null, error: null });
    });

    it("falls back to in_progress for legacy Didit sessions without UUID", async () => {
      mockPrisma.kyc_verifications.findFirst.mockResolvedValue({
        id: "kyc-1",
        user_id: "user-1",
        status: "pending",
        document_type: "didit",
        document_url: "https://verify.didit.me/session/shortURL",
      });

      const result = await getVerificationStatus("user-1");

      expect(result.error).toBeNull();
      expect(result.status?.status).toBe("in_progress");
      expect(result.status?.document_url).toBe("https://verify.didit.me/session/shortURL");
    });

    it("fetches Didit API and webhook for valid Didit sessions with UUID", async () => {
      mockPrisma.kyc_verifications.findFirst.mockResolvedValue({
        id: "kyc-1",
        user_id: "user-1",
        status: "pending",
        document_type: "didit",
        document_url: "uuid-123:::https://verify.didit.me/session/shortURL",
      });

      // Mock Didit GET session and Webhook simulate
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation((url) => {
        if (url.includes("verification.didit.me")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ session_id: "uuid-123", status: "Approved" }),
          });
        }
        if (url.includes("/api/webhooks/didit")) {
          return Promise.resolve({ ok: true });
        }
        return Promise.reject(new Error("Unknown URL"));
      }) as jest.Mock;

      mockPrisma.kyc_verifications.findUnique.mockResolvedValue({
        id: "kyc-1",
        status: "approved",
        document_url: "https://verify.didit.me/session/shortURL",
      });

      const result = await getVerificationStatus("user-1");

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result.status?.status).toBe("approved");
      expect(result.status?.document_url).toBe("https://verify.didit.me/session/shortURL");

      // Restore fetch
      global.fetch = originalFetch;
    });
  });

  describe("updateVerificationStatus", () => {
    it("returns error when not authenticated", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      const result = await updateVerificationStatus("kyc-1", "approved");

      expect(result).toEqual({ error: "Not authenticated" });
    });

    it("returns error when user is not admin or manager", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue({ id: "user-1" });
      (isAdminOrManager as jest.Mock).mockResolvedValue(false);

      const result = await updateVerificationStatus("kyc-1", "approved");

      expect(result).toEqual({ error: "Unauthorized" });
    });

    it("approves verification and sends email", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue({ id: "admin-1" });
      (isAdminOrManager as jest.Mock).mockResolvedValue(true);
      mockPrisma.kyc_verifications.update.mockResolvedValue({});
      mockPrisma.kyc_verifications.findUnique.mockResolvedValue({
        user_id: "user-1",
        full_name: "Test User",
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        email: "user@test.com",
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await updateVerificationStatus("kyc-1", "approved");

      expect(result).toEqual({ error: null });
      expect(logAdminActivity).toHaveBeenCalledWith("approve-kyc", "admin-1");
      expect(sendKycApprovedEmail).toHaveBeenCalledWith(
        "user@test.com",
        "Test User",
      );
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/admin/users");
    });
  });

  describe("sendKycReminderToUnverifiedUsers", () => {
    it("returns unauthorized when user lacks permission", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue({ id: "user-1" });
      (isAdminOrManager as jest.Mock).mockResolvedValue(false);

      const result = await sendKycReminderToUnverifiedUsers();

      expect(result).toEqual({
        sent: 0,
        failed: 0,
        skipped: 0,
        error: "Unauthorized",
      });
    });

    it("sends reminders to eligible unverified users", async () => {
      (getCurrentUser as jest.Mock).mockResolvedValue({ id: "admin-1" });
      (isAdminOrManager as jest.Mock).mockResolvedValue(true);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: "u1", email: "a@test.com", fullName: "Alice" },
        { id: "u2", email: "b@test.com", fullName: "Bob" },
      ]);
      mockPrisma.kyc_verifications.findMany.mockResolvedValue([
        { user_id: "u2" },
      ]);

      const result = await sendKycReminderToUnverifiedUsers();

      expect(result).toEqual({
        sent: 1,
        failed: 0,
        skipped: 1,
        error: null,
      });
      expect(sendKycReminderEmail).toHaveBeenCalledTimes(1);
      expect(sendKycReminderEmail).toHaveBeenCalledWith(
        "a@test.com",
        "Alice",
      );
    });
  });
});
