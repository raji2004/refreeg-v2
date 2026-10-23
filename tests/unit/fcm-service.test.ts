import {
  getFirebaseAdminApp,
  sendPushToUser,
  sendPushMulticast,
} from "@/lib/notifications/fcm-service";
import * as deviceTokenService from "@/lib/notifications/device-token-service";
import { getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

jest.mock("@/lib/notifications/device-token-service", () => ({
  getUserDeviceTokens: jest.fn(),
  deleteInvalidTokens: jest.fn(),
}));

let mockApps: any[] = [];
const mockSendEachForMulticast = jest.fn();

jest.mock("firebase-admin/app", () => ({
  initializeApp: jest.fn().mockImplementation(() => {
    const app = { name: "mockApp" };
    mockApps.push(app);
    return app;
  }),
  getApps: jest.fn(() => mockApps),
  cert: jest.fn(),
}));

jest.mock("firebase-admin/messaging", () => ({
  getMessaging: jest.fn(() => ({
    sendEachForMulticast: mockSendEachForMulticast,
  })),
}));

describe("FCM Service: lib/notifications/fcm-service", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    mockApps = [];
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should return null and mark skipped if no credentials in env", async () => {
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    const res = await sendPushToUser({
      userId: "user-123",
      title: "Test",
      body: "Test body",
    });

    expect(res.skipped).toBe(true);
    expect(res.success).toBe(false);
  });

  it("should initialize Firebase Admin when env credentials are provided", () => {
    process.env.FIREBASE_PROJECT_ID = "test-project";
    process.env.FIREBASE_CLIENT_EMAIL = "test@example.com";
    process.env.FIREBASE_PRIVATE_KEY = "test-key-with-\\n-escaped";

    const app = getFirebaseAdminApp();
    expect(app).toBeDefined();
    expect(initializeApp).toHaveBeenCalled();
  });

  it("should prune dead tokens when FCM returns invalid-registration-token", async () => {
    mockApps = [{ name: "mockApp" }];
    mockSendEachForMulticast.mockResolvedValue({
      successCount: 1,
      failureCount: 1,
      responses: [
        { success: true },
        {
          success: false,
          error: { code: "messaging/registration-token-not-registered" },
        },
      ],
    });

    const res = await sendPushMulticast({
      tokens: ["valid-token", "dead-token"],
      title: "Donation Received",
      body: "You received ₦5,000",
      data: { amount: 5000, causeId: "cause-123" },
    });

    expect(res.sentCount).toBe(1);
    expect(res.failureCount).toBe(1);
    expect(deviceTokenService.deleteInvalidTokens).toHaveBeenCalledWith([
      "dead-token",
    ]);
  });
});
