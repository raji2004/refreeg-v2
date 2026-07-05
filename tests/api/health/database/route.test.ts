/**
 * @jest-environment node
 */
jest.mock("@/lib/health/checks", () => ({
  isHealthCheckAuthorized: jest.fn(),
  runDatabaseHealthCheck: jest.fn(),
}));

import { GET } from "@/app/api/health/database/route";
import {
  isHealthCheckAuthorized,
  runDatabaseHealthCheck,
} from "@/lib/health/checks";

describe("GET /api/health/database", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when health check auth fails", async () => {
    (isHealthCheckAuthorized as jest.Mock).mockReturnValue(false);

    const response = await GET(
      new Request("http://localhost:3000/api/health/database"),
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.status).toBe("unavailable");
    expect(body.latencyMs).toBe(0);
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(runDatabaseHealthCheck).not.toHaveBeenCalled();
  });

  it("returns 200 when the database is reachable", async () => {
    (isHealthCheckAuthorized as jest.Mock).mockReturnValue(true);
    (runDatabaseHealthCheck as jest.Mock).mockResolvedValue({
      status: "operational",
      latencyMs: 12,
      timestamp: "2026-06-29T12:00:00.000Z",
    });

    const response = await GET(
      new Request("http://localhost:3000/api/health/database"),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      status: "operational",
      latencyMs: 12,
      timestamp: "2026-06-29T12:00:00.000Z",
    });
  });

  it("returns 503 when the database query fails", async () => {
    (isHealthCheckAuthorized as jest.Mock).mockReturnValue(true);
    (runDatabaseHealthCheck as jest.Mock).mockResolvedValue({
      status: "unavailable",
      latencyMs: 48,
      timestamp: "2026-06-29T12:00:00.000Z",
    });

    const response = await GET(
      new Request("http://localhost:3000/api/health/database"),
    );

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.status).toBe("unavailable");
    expect(body.latencyMs).toBe(48);
  });
});
