import { NextResponse } from "next/server";
import {
  isHealthCheckAuthorized,
  runDatabaseHealthCheck,
} from "@/lib/health/checks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isHealthCheckAuthorized(request)) {
    return NextResponse.json(
      {
        status: "unavailable",
        latencyMs: 0,
        timestamp: new Date().toISOString(),
      },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const health = await runDatabaseHealthCheck();
  const httpStatus = health.status === "operational" ? 200 : 503;

  return NextResponse.json(health, {
    status: httpStatus,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
