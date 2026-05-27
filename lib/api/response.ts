import { NextResponse } from "next/server";

/**
 * Standardized API success response
 */
export function apiSuccess<T>(data: T, status = 200, headers?: HeadersInit) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    {
      status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        ...headers,
      },
    }
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
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        ...headers,
      },
    }
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
  status = 200
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
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    }
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
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400", // 24 hours
    },
  });
}
