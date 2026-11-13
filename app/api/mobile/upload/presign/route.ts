import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import {
  generatePresignedPutUrl,
  generateS3Key,
  type S3EntityType,
} from "@/lib/s3/s3-utils";

export async function OPTIONS() {
  return handleCorsPreflight();
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const { entityType, fileType, fileName, entityId } = body;

    if (!entityType || !fileType || !fileName) {
      return apiError("Missing required fields (entityType, fileType, fileName)", 400);
    }

    const validEntityTypes: S3EntityType[] = [
      "causes",
      "profiles",
      "petitions",
      "kyc",
      "organizations",
    ];
    if (!validEntityTypes.includes(entityType as S3EntityType)) {
      return apiError(`Invalid entityType. Must be one of: ${validEntityTypes.join(", ")}`, 400);
    }

    const isVideo = fileType.startsWith("video/");
    const uniqueId = Math.random().toString(36).substring(2, 15);
    const ext = fileName.split(".").pop() || (isVideo ? "mp4" : "jpg");

    // Fallback entityId to a random UUID if not provided
    const eId = entityId || crypto.randomUUID();

    const s3Key = generateS3Key({
      entityType: entityType as S3EntityType,
      userId: user!.id,
      entityId: eId,
      mediaType: isVideo ? "videos" : "images",
      filename: `${uniqueId}.${ext}`,
    });

    // Generate presigned URL valid for 15 minutes using shared S3 helper (AWS_S3_BUCKET)
    const uploadUrl = await generatePresignedPutUrl(s3Key, fileType, 900);

    return apiSuccess({
      uploadUrl,
      s3Key,
      entityId: eId // Return the generated entityId so the client can use it later if needed
    });
  } catch (error: any) {
    console.error("Mobile API Upload Presign Error:", error);
    return apiError("Internal server error", 500);
  }
}
