import { NextResponse } from "next/server";
import { CORS_HEADERS } from "@/utils/api-bot/cors";


export enum ApiErrorCode {
  INVALID_API_KEY = "invalid_api_key",
  RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
  CAMPAIGN_NOT_FOUND = "campaign_not_found",
  INVALID_CATEGORY = "invalid_category",
  VALIDATION_ERROR = "validation_error",
  PAYMENT_FAILED = "payment_failed",
  INVALID_BANK_ACCOUNT = "invalid_bank_account",
  CAMPAIGN_NOT_ACTIVE = "campaign_not_active",
  NOT_FOUND = "not_found",
  INTERNAL_ERROR = "internal_error",
  UNAUTHORIZED = "unauthorized",
  FORBIDDEN = "forbidden",
  BAD_REQUEST = "bad_request",
  PAYMENT_SETUP_FAILED = "payment_setup_failed",
  DATABASE_ERROR = "database_error",
}


export function successResponse(data: any, status = 200) {
  return NextResponse.json(
    {
      status: "success",
      data,
    },
    { status, headers: CORS_HEADERS }
  );
}


export function errorResponse(
  message: string,
  code: ApiErrorCode | string,
  status: number = 400,
  details?: any
) {
  return NextResponse.json(
    {
      status: "error",
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status, headers: CORS_HEADERS }
  );
}


export function paginatedResponse(
  data: any[],
  total: number,
  limit: number,
  offset: number,
  status = 200
) {
  return NextResponse.json(
    {
      status: "success",
      data,
      meta: {
        total,
        limit,
        offset,
      },
    },
    { status, headers: CORS_HEADERS }
  );
}
