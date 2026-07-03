/**
 * @jest-environment node
 */
jest.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: jest.fn(),
    pledges: {
      findFirst: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { runDatabaseHealthCheck, runHealthChecks } from "@/lib/health/checks";

const mockPrisma = prisma as unknown as {
  $queryRaw: jest.Mock;
  pledges: { findFirst: jest.Mock };
};
const originalFetch = global.fetch;
const originalPaystackKey = process.env.PAYSTACK_SECRET_KEY;

describe("runHealthChecks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PAYSTACK_SECRET_KEY = "sk_test_secret";
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalPaystackKey === undefined) {
      delete process.env.PAYSTACK_SECRET_KEY;
    } else {
      process.env.PAYSTACK_SECRET_KEY = originalPaystackKey;
    }
  });

  it("returns operational when all services are healthy", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    mockPrisma.pledges.findFirst.mockResolvedValue({ id: "pledge-1" });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
    });

    const result = await runHealthChecks();

    expect(result.status).toBe("operational");
    expect(result.services).toEqual({
      database: "operational",
      bookings: "operational",
      payments: "operational",
    });
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns unavailable when database check fails", async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error("db down"));
    mockPrisma.pledges.findFirst.mockResolvedValue({ id: "pledge-1" });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    const result = await runHealthChecks();

    expect(result.status).toBe("unavailable");
    expect(result.services.database).toBe("unavailable");
  });

  it("returns unavailable when bookings check fails", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    mockPrisma.pledges.findFirst.mockRejectedValue(new Error("pledges down"));
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    const result = await runHealthChecks();

    expect(result.status).toBe("unavailable");
    expect(result.services.bookings).toBe("unavailable");
  });

  it("returns unavailable when paystack secret is missing", async () => {
    delete process.env.PAYSTACK_SECRET_KEY;
    mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    mockPrisma.pledges.findFirst.mockResolvedValue({ id: "pledge-1" });

    const result = await runHealthChecks();

    expect(result.status).toBe("unavailable");
    expect(result.services.payments).toBe("unavailable");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns unavailable when paystack responds with non-ok status", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    mockPrisma.pledges.findFirst.mockResolvedValue({ id: "pledge-1" });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

    const result = await runHealthChecks();

    expect(result.status).toBe("unavailable");
    expect(result.services.payments).toBe("unavailable");
  });

  it("returns unavailable when paystack request throws", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    mockPrisma.pledges.findFirst.mockResolvedValue({ id: "pledge-1" });
    (global.fetch as jest.Mock).mockRejectedValue(new Error("network error"));

    const result = await runHealthChecks();

    expect(result.status).toBe("unavailable");
    expect(result.services.payments).toBe("unavailable");
  });

  it("returns unavailable when a service check times out", async () => {
    jest.useFakeTimers();

    mockPrisma.$queryRaw.mockImplementation(
      () => new Promise(() => undefined),
    );
    mockPrisma.pledges.findFirst.mockResolvedValue({ id: "pledge-1" });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    const resultPromise = runHealthChecks();
    await jest.advanceTimersByTimeAsync(5_001);
    const result = await resultPromise;

    expect(result.services.database).toBe("unavailable");
    jest.useRealTimers();
  });
});

describe("runDatabaseHealthCheck", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns operational with latency when SELECT 1 succeeds", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

    const result = await runDatabaseHealthCheck();

    expect(result.status).toBe("operational");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(mockPrisma.$queryRaw).toHaveBeenCalled();
  });

  it("returns unavailable with latency when SELECT 1 fails", async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error("db down"));

    const result = await runDatabaseHealthCheck();

    expect(result.status).toBe("unavailable");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns unavailable when the database check times out", async () => {
    jest.useFakeTimers();

    mockPrisma.$queryRaw.mockImplementation(
      () => new Promise(() => undefined),
    );

    const resultPromise = runDatabaseHealthCheck();
    await jest.advanceTimersByTimeAsync(5_001);
    const result = await resultPromise;

    expect(result.status).toBe("unavailable");
    expect(result.latencyMs).toBeGreaterThanOrEqual(5_000);
    jest.useRealTimers();
  });
});
