import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import Paystack from "@/services/paystack";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  try {
    // Basic cache implementation since banks rarely change
    const CACHE_KEY = "paystack_banks_cache";
    // We don't have a Redis cache here, so we just fetch directly
    // Ideally, we'd cache this in memory or Redis for 24h
    
    const banks = await Paystack.listBanks();
    return apiSuccess(banks);
  } catch (error: any) {
    console.error("Mobile API Get Banks Error:", error);
    return apiError("Failed to fetch banks", 500);
  }
}
