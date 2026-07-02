import { prisma } from "@/lib/prisma";
import type { HealthCheckResponse, ServiceStatus } from "@/lib/health/types";

const CHECK_TIMEOUT_MS = 5_000;

async function runWithTimeout<T>(
  label: string,
  task: () => Promise<T>,
  timeoutMs = CHECK_TIMEOUT_MS,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      task(),
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`${label} timed out`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function checkDatabase(): Promise<ServiceStatus> {
  try {
    await runWithTimeout("database", () => prisma.$queryRaw`SELECT 1`);
    return "operational";
  } catch (error) {
    console.error("[health] database check failed");
    return "unavailable";
  }
}

/**
 * Bookings maps to the pledge scheduling subsystem (scheduled donation commitments).
 */
async function checkBookings(): Promise<ServiceStatus> {
  try {
    await runWithTimeout("bookings", () =>
      prisma.pledges.findFirst({
        select: { id: true },
      }),
    );
    return "operational";
  } catch (error) {
    console.error("[health] bookings check failed");
    return "unavailable";
  }
}

async function checkPayments(): Promise<ServiceStatus> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();

  if (!secretKey) {
    console.error("[health] payments check failed: missing configuration");
    return "unavailable";
  }

  try {
    const response = await runWithTimeout(
      "payments",
      () =>
        fetch("https://api.paystack.co/bank?currency=NGN&perPage=1", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${secretKey}`,
            Accept: "application/json",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
        }),
    );

    if (!response.ok) {
      console.error("[health] payments check failed: upstream unavailable");
      return "unavailable";
    }

    return "operational";
  } catch (error) {
    console.error("[health] payments check failed");
    return "unavailable";
  }
}

export async function runHealthChecks(): Promise<HealthCheckResponse> {
  const [database, bookings, payments] = await Promise.all([
    checkDatabase(),
    checkBookings(),
    checkPayments(),
  ]);

  const services = { database, bookings, payments };
  const status =
    Object.values(services).every((service) => service === "operational")
      ? "operational"
      : "unavailable";

  return {
    status,
    services,
    timestamp: new Date().toISOString(),
  };
}

export function isHealthCheckAuthorized(request: Request): boolean {
  const expectedToken = process.env.HEALTH_CHECK_TOKEN?.trim();

  if (!expectedToken) {
    return true;
  }

  const bearer = request.headers.get("authorization");
  const headerToken = request.headers.get("x-health-check-token");
  const providedToken = bearer?.replace(/^Bearer\s+/i, "").trim() || headerToken;

  return providedToken === expectedToken;
}
