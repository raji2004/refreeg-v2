jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn().mockImplementation((body, init) => ({
      json: async () => body,
      status: init?.status || 200,
      headers: init?.headers || {},
    })),
  },
}));

import { GET, POST } from "@/app/api/admin/notifications/broadcast/route";
import { auth } from "@/lib/auth/auth";
import { isAdminOrManager } from "@/actions/role-actions";
import * as deviceTokenService from "@/lib/notifications/device-token-service";
import * as fcmService from "@/lib/notifications/fcm-service";

jest.mock("@/lib/auth/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/actions/role-actions", () => ({
  isAdminOrManager: jest.fn(),
}));

jest.mock("@/lib/notifications/device-token-service", () => ({
  getDeviceTokenStats: jest.fn(),
  getDeviceTokensForBroadcast: jest.fn(),
  ensureDeviceTokensTable: jest.fn(),
}));

jest.mock("@/lib/notifications/fcm-service", () => ({
  sendPushMulticast: jest.fn(),
}));

jest.mock("@/lib/notifications/notification-service", () => ({
  createNotification: jest.fn().mockResolvedValue({ id: "notif-1" }),
}));

describe("Admin Broadcast API: /api/admin/notifications/broadcast", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/admin/notifications/broadcast", () => {
    it("should return 401 if not logged in", async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("should return 403 if not admin or manager", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "user-reg" } });
      (isAdminOrManager as jest.Mock).mockResolvedValue(false);

      const res = await GET();
      expect(res.status).toBe(403);
    });

    it("should return device stats when authorized", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "admin-1" } });
      (isAdminOrManager as jest.Mock).mockResolvedValue(true);
      (deviceTokenService.getDeviceTokenStats as jest.Mock).mockResolvedValue({
        total: 15,
        android: 12,
        ios: 3,
        web: 0,
      });

      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.stats.total).toBe(15);
      expect(json.data.stats.android).toBe(12);
    });
  });

  describe("POST /api/admin/notifications/broadcast", () => {
    it("should reject empty title or message", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "admin-1" } });
      (isAdminOrManager as jest.Mock).mockResolvedValue(true);

      const req = {
        json: jest.fn().mockResolvedValue({ title: "", message: "" }),
      } as any;

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Notification title is required");
    });

    it("should broadcast to target device tokens successfully", async () => {
      (auth as jest.Mock).mockResolvedValue({ user: { id: "admin-1" } });
      (isAdminOrManager as jest.Mock).mockResolvedValue(true);

      (
        deviceTokenService.getDeviceTokensForBroadcast as jest.Mock
      ).mockResolvedValue([
        { token: "fcm-tok-1", userId: "user-1", platform: "android" },
        { token: "fcm-tok-2", userId: "user-2", platform: "ios" },
      ]);

      (fcmService.sendPushMulticast as jest.Mock).mockResolvedValue({
        success: true,
        sentCount: 2,
        failureCount: 0,
      });

      const req = {
        json: jest.fn().mockResolvedValue({
          title: "Urgent Flood Relief",
          message: "Please support affected families in Maiduguri.",
          audience: "all",
        }),
      } as any;

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.targetedDevices).toBe(2);
      expect(json.data.sentCount).toBe(2);
      expect(fcmService.sendPushMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens: ["fcm-tok-1", "fcm-tok-2"],
          title: "Urgent Flood Relief",
          body: "Please support affected families in Maiduguri.",
        }),
      );
    });
  });
});
