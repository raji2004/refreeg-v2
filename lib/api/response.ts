import { NextResponse } from "next/server";

function serializeSafe<T>(data: T): any {
  if (data === null || data === undefined) return data;
  if (typeof data === "bigint") return Number(data);
  if (data instanceof Date) return data.toISOString();
  if (Array.isArray(data)) return data.map(serializeSafe);
  if (typeof data === "object") {
    // Check for Prisma Decimal or Decimal.js instances
    if (
      typeof (data as any)?.toNumber === "function" ||
      ("d" in (data as any) && "s" in (data as any) && "e" in (data as any))
    ) {
      return Number((data as any).toString());
    }
    const res: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      res[key] = serializeSafe(val);
    }
    return res;
  }
  return data;
}

/**
 * Standardized API success response
 */
export function apiSuccess<T>(data: T, status = 200, headers?: HeadersInit) {
  return NextResponse.json(
    {
      success: true,
      data: serializeSafe(data),
    },
    {
      status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Requested-With, Accept",
        ...headers,
      },
    },
  );
}

/**
 * Standardized API error response
 */
export function apiError(message: string, status = 400, headers?: HeadersInit) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    {
      status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Requested-With, Accept",
        ...headers,
      },
    },
  );
}

/**
 * Standardized API paginated response
 */
export function apiPaginated<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number,
  status = 200,
) {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        total,
        limit,
        offset,
      },
    },
    {
      status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Requested-With, Accept",
      },
    },
  );
}

/**
 * Helper for handling OPTIONS requests (CORS preflight)
 */
export function handleCorsPreflight() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Requested-With, Accept",
      "Access-Control-Max-Age": "86400", // 24 hours
    },
  });
}
