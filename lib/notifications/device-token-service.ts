import { prisma } from "@/lib/prisma";

let tableEnsured = false;

export async function ensureDeviceTokensTable(): Promise<void> {
  if (tableEnsured) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "device_tokens" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL,
        "token" TEXT NOT NULL,
        "platform" VARCHAR(20) NOT NULL DEFAULT 'android',
        "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "device_tokens_token_key" UNIQUE ("token")
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_device_tokens_user" ON "device_tokens"("user_id")
    `);
    tableEnsured = true;
  } catch (error) {
    console.error("Failed to ensure device_tokens table:", error);
  }
}

export interface RegisterTokenParams {
  userId: string;
  token: string;
  platform?: "android" | "ios" | "web";
}

export async function registerDeviceToken(
  params: RegisterTokenParams,
): Promise<boolean> {
  await ensureDeviceTokensTable();
  const { userId, token, platform = "android" } = params;

  if (!userId || !token) return false;

  try {
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO "device_tokens" ("id", "user_id", "token", "platform", "created_at", "updated_at")
      VALUES (gen_random_uuid(), $1::uuid, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("token") DO UPDATE
      SET "user_id" = EXCLUDED."user_id",
          "platform" = EXCLUDED."platform",
          "updated_at" = CURRENT_TIMESTAMP
      `,
      userId,
      token,
      platform,
    );
    return true;
  } catch (error) {
    console.error("Error registering device token:", error);
    return false;
  }
}

export async function unregisterDeviceToken(token: string): Promise<boolean> {
  await ensureDeviceTokensTable();
  if (!token) return false;

  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "device_tokens" WHERE "token" = $1`,
      token,
    );
    return true;
  } catch (error) {
    console.error("Error unregistering device token:", error);
    return false;
  }
}

export async function getUserDeviceTokens(userId: string): Promise<string[]> {
  await ensureDeviceTokensTable();
  if (!userId) return [];

  try {
    const rows = await prisma.$queryRawUnsafe<{ token: string }[]>(
      `SELECT "token" FROM "device_tokens" WHERE "user_id" = $1::uuid`,
      userId,
    );
    return rows.map((r) => r.token);
  } catch (error) {
    console.error("Error fetching device tokens for user:", error);
    return [];
  }
}

export async function deleteInvalidTokens(tokens: string[]): Promise<void> {
  if (!tokens || tokens.length === 0) return;
  await ensureDeviceTokensTable();

  try {
    // Parameterize deletion safely
    const placeholders = tokens.map((_, i) => `$${i + 1}`).join(", ");
    await prisma.$executeRawUnsafe(
      `DELETE FROM "device_tokens" WHERE "token" IN (${placeholders})`,
      ...tokens,
    );
  } catch (error) {
    console.error("Error deleting invalid device tokens:", error);
  }
}

export async function countActiveDeviceTokens(): Promise<number> {
  await ensureDeviceTokensTable();
  try {
    const res = await prisma.$queryRawUnsafe<{ count: string | number }[]>(
      `SELECT COUNT(*)::int as count FROM "device_tokens"`,
    );
    return Number(res[0]?.count || 0);
  } catch (error) {
    console.error("Error counting device tokens:", error);
    return 0;
  }
}

export interface DeviceTokenRow {
  token: string;
  userId: string;
  platform: string;
}

export async function getDeviceTokensForBroadcast(
  audience: "all" | "creators" | "donors" = "all",
): Promise<DeviceTokenRow[]> {
  await ensureDeviceTokensTable();

  try {
    if (audience === "creators") {
      return await prisma.$queryRawUnsafe<DeviceTokenRow[]>(`
        SELECT DISTINCT dt."token", dt."user_id" as "userId", dt."platform"
        FROM "device_tokens" dt
        INNER JOIN "causes" c ON c."user_id" = dt."user_id"
      `);
    } else if (audience === "donors") {
      return await prisma.$queryRawUnsafe<DeviceTokenRow[]>(`
        SELECT DISTINCT dt."token", dt."user_id" as "userId", dt."platform"
        FROM "device_tokens" dt
        INNER JOIN "donations" d ON d."user_id" = dt."user_id"
      `);
    } else {
      return await prisma.$queryRawUnsafe<DeviceTokenRow[]>(`
        SELECT "token", "user_id" as "userId", "platform"
        FROM "device_tokens"
      `);
    }
  } catch (error) {
    console.error("Error fetching device tokens for broadcast:", error);
    return [];
  }
}

export async function getDeviceTokenStats(): Promise<{
  total: number;
  android: number;
  ios: number;
  web: number;
}> {
  await ensureDeviceTokensTable();
  try {
    const rows = await prisma.$queryRawUnsafe<
      {
        platform: string;
        count: string | number;
      }[]
    >(`
      SELECT "platform", COUNT(*)::int as count
      FROM "device_tokens"
      GROUP BY "platform"
    `);

    let total = 0;
    let android = 0;
    let ios = 0;
    let web = 0;

    for (const row of rows) {
      const c = Number(row.count || 0);
      total += c;
      if (row.platform === "android") android += c;
      else if (row.platform === "ios") ios += c;
      else if (row.platform === "web") web += c;
    }

    return { total, android, ios, web };
  } catch (error) {
    console.error("Error fetching device token stats:", error);
    return { total: 0, android: 0, ios: 0, web: 0 };
  }
}
