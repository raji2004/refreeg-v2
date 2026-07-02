/**
 * @jest-environment node
 */
jest.mock("@/lib/health/checks", () => ({
  isHealthCheckAuthorized: jest.fn(),
  runHealthChecks: jest.fn(),
}));

import { GET } from "@/app/api/health/route";
import {
  isHealthCheckAuthorized,
  runHealthChecks,
} from "@/lib/health/checks";

describe("GET /api/health", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when health check auth fails", async () => {
    (isHealthCheckAuthorized as jest.Mock).mockReturnValue(false);

    const response = await GET(new Request("http://localhost:3000/api/health"));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.status).toBe("unavailable");
    expect(runHealthChecks).not.toHaveBeenCalled();
  });

  it("returns 200 when all services are operational", async () => {
    (isHealthCheckAuthorized as jest.Mock).mockReturnValue(true);
    (runHealthChecks as jest.Mock).mockResolvedValue({
      status: "operational",
      services: {
        database: "operational",
        bookings: "operational",
        payments: "operational",
      },
      timestamp: "2026-06-29T12:00:00.000Z",
    });

    const response = await GET(new Request("http://localhost:3000/api/health"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("operational");
    expect(body.services.database).toBe("operational");
  });

  it("returns 503 when a required service is unavailable", async () => {
    (isHealthCheckAuthorized as jest.Mock).mockReturnValue(true);
    (runHealthChecks as jest.Mock).mockResolvedValue({
      status: "unavailable",
      services: {
        database: "operational",
        bookings: "operational",
        payments: "unavailable",
      },
      timestamp: "2026-06-29T12:00:00.000Z",
    });

    const response = await GET(new Request("http://localhost:3000/api/health"));

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.status).toBe("unavailable");
    expect(body.services.payments).toBe("unavailable");
  });
});
