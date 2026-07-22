import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return handleCorsPreflight();
}

/**
 * GET /api/mobile/kyc/legacy
 * 
 * Returns the legacy (manual upload) KYC verification data for the authenticated user.
 * This endpoint is for users who completed KYC through the old manual document upload
 * flow before the Didit integration was implemented.
 * 
 * For legacy records, `document_type` will be a document type string like
 * "passport", "national_id", "drivers_license", etc. (NOT "didit").
 * 
 * Response:
 *   {
 *     "success": true,
 *     "data": {
 *       "has_legacy_kyc": true,
 *       "verification": {
 *         "id": "...",
 *         "status": "approved",
 *         "document_type": "passport",
 *         "full_name": "...",
 *         "dob": "...",
 *         "phone": "...",
 *         "address": "...",
 *         "city": "...",
 *         "state": "...",
 *         "postal": "...",
 *         "country": "...",
 *         "verification_notes": "...",
 *         "created_at": "...",
 *         "updated_at": "..."
 *       }
 *     }
 *   }
 */
export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    // Find the most recent NON-didit (legacy) KYC record
    const legacyKyc = await prisma.kyc_verifications.findFirst({
      where: {
        user_id: user!.id,
        document_type: { not: "didit" },
      },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        status: true,
        document_type: true,
        full_name: true,
        dob: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        postal: true,
        country: true,
        verification_notes: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!legacyKyc) {
      return apiSuccess({
        has_legacy_kyc: false,
        verification: null,
      });
    }

    return apiSuccess({
      has_legacy_kyc: true,
      verification: legacyKyc,
    });
  } catch (error: any) {
    console.error("Mobile API Get Legacy KYC Error:", error);
    return apiError("Internal server error", 500);
  }
}
