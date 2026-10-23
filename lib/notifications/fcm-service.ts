import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import {
  getMessaging,
  type MulticastMessage,
  type SendResponse,
} from "firebase-admin/messaging";
import {
  getUserDeviceTokens,
  deleteInvalidTokens,
} from "@/lib/notifications/device-token-service";

let fcmWarningLogged = false;

/**
 * Initialize Firebase Admin App once.
 * Gracefully handles missing credentials in local development.
 */
export function getFirebaseAdminApp(): App | null {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0]!;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  // Also support full JSON string if provided
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  try {
    if (serviceAccountJson) {
      const parsed = JSON.parse(serviceAccountJson);
      return initializeApp({
        credential: cert(parsed),
      });
    }

    if (projectId && clientEmail && privateKey) {
      // Handle escaped newlines in env variables
      if (privateKey.includes("\\n")) {
        privateKey = privateKey.replace(/\\n/g, "\n");
      }
      return initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }

    if (!fcmWarningLogged) {
      console.warn(
        "[FCM] Firebase Admin credentials not found in environment (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY). Push notifications will be skipped.",
      );
      fcmWarningLogged = true;
    }
    return null;
  } catch (error) {
    console.error("[FCM] Failed to initialize Firebase Admin SDK:", error);
    return null;
  }
}

export interface SendPushParams {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
}

export interface PushResult {
  success: boolean;
  sentCount: number;
  failureCount: number;
  skipped?: boolean;
}

export interface SendMulticastParams {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
}

/**
 * Send multicast FCM message to a list of device tokens.
 */
export async function sendPushMulticast(
  params: SendMulticastParams,
): Promise<PushResult> {
  const { tokens, title, body, data, imageUrl } = params;

  const app = getFirebaseAdminApp();
  if (!app) {
    return { success: false, sentCount: 0, failureCount: 0, skipped: true };
  }

  if (!tokens || tokens.length === 0) {
    return { success: true, sentCount: 0, failureCount: 0 };
  }

  // Ensure all data values are strings as required by FCM
  const stringData: Record<string, string> = {};
  if (data) {
    for (const [key, value] of Object.entries(data)) {
      stringData[key] =
        typeof value === "string" ? value : JSON.stringify(value);
    }
  }

  // FCM message structure
  const message: MulticastMessage = {
    tokens,
    notification: {
      title,
      body,
      ...(imageUrl ? { imageUrl } : {}),
    },
    data: stringData,
    android: {
      priority: "high",
      notification: {
        channelId: "refreeg_important_channel",
        sound: "default",
        clickAction: "FLUTTER_NOTIFICATION_CLICK",
        ...(imageUrl ? { imageUrl } : {}),
      },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          badge: 1,
        },
      },
    },
  };

  try {
    const messaging = getMessaging(app);
    const response = await messaging.sendEachForMulticast(message);

    // Identify and purge dead tokens
    const invalidTokens: string[] = [];
    response.responses.forEach((resp: SendResponse, index: number) => {
      if (!resp.success && resp.error) {
        const errorCode = resp.error.code;
        if (
          errorCode === "messaging/invalid-registration-token" ||
          errorCode === "messaging/registration-token-not-registered"
        ) {
          invalidTokens.push(tokens[index]);
        }
      }
    });

    if (invalidTokens.length > 0) {
      // Fire-and-forget token cleanup so it doesn't block the caller
      Promise.resolve(deleteInvalidTokens(invalidTokens)).catch((err) =>
        console.error("[FCM] Error pruning invalid tokens:", err),
      );
    }

    return {
      success: response.successCount > 0,
      sentCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    console.error("[FCM] Error sending multicast push notification:", error);
    return {
      success: false,
      sentCount: 0,
      failureCount: tokens.length,
    };
  }
}

/**
 * Send real-time FCM push notification to all registered devices of a user.
 * Automatically cleans up invalid or expired FCM registration tokens.
 */
export async function sendPushToUser(
  params: SendPushParams,
): Promise<PushResult> {
  const { userId, title, body, data, imageUrl } = params;

  const app = getFirebaseAdminApp();
  if (!app) {
    return { success: false, sentCount: 0, failureCount: 0, skipped: true };
  }

  const tokens = await getUserDeviceTokens(userId);
  if (!tokens || tokens.length === 0) {
    return { success: true, sentCount: 0, failureCount: 0 };
  }

  return sendPushMulticast({
    tokens,
    title,
    body,
    data,
    imageUrl,
  });
}
