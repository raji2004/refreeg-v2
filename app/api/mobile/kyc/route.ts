import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { getVerificationStatus, updateVerificationStatus } from "@/actions/kyc-actions";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const status = await getVerificationStatus(user!.id);
    return apiSuccess(status);
  } catch (error: any) {
    console.error("Mobile API Get KYC Status Error:", error);
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    
    if (!body.documentType || !body.documentS3Key || !body.idNumber) {
      return apiError("Missing required fields (documentType, documentS3Key, idNumber)", 400);
    }

    // Since we're using S3 presigned URLs, the file is already uploaded.
    // We just need to save the KYC record. We bypass the `uploadKycDocument` server action
    // because it expects a File object.
    
    let kycSubmission = await prisma.kyc_verifications.findFirst({
      where: { user_id: user!.id }
    });

    if (kycSubmission) {
      kycSubmission = await prisma.kyc_verifications.update({
        where: { id: kycSubmission.id },
        data: {
          document_type: body.documentType,
          document_url: body.documentS3Key,
          status: "pending",
        }
      });
    } else {
      kycSubmission = await prisma.kyc_verifications.create({
        data: {
          user_id: user!.id,
          document_type: body.documentType,
          document_url: body.documentS3Key,
          status: "pending",
        }
      });
    }
    
    return apiSuccess(kycSubmission, 201);
  } catch (error: any) {
    console.error("Mobile API Submit KYC Error:", error);
    return apiError("Internal server error", 500);
  }
}
