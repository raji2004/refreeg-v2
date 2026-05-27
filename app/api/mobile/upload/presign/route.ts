import { NextRequest } from "next/server";
import { apiSuccess, apiError, handleCorsPreflight } from "@/lib/api/response";
import { authenticateMobileRequest } from "@/lib/auth/mobile-auth";
import { generateS3Key } from "@/lib/s3/s3-utils";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function OPTIONS() {
  return handleCorsPreflight();
}

// Create an S3 client for presigning
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await authenticateMobileRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const { entityType, fileType, fileName, entityId } = body;

    if (!entityType || !fileType || !fileName) {
      return apiError("Missing required fields (entityType, fileType, fileName)", 400);
    }

    const validEntityTypes = ["causes", "profiles", "petitions", "kyc"];
    if (!validEntityTypes.includes(entityType)) {
      return apiError(`Invalid entityType. Must be one of: ${validEntityTypes.join(", ")}`, 400);
    }

    const isVideo = fileType.startsWith("video/");
    const uniqueId = Math.random().toString(36).substring(2, 15);
    const ext = fileName.split(".").pop() || (isVideo ? "mp4" : "jpg");
    
    // Fallback entityId to a random UUID if not provided
    const eId = entityId || crypto.randomUUID();

    const s3Key = generateS3Key({
      entityType,
      userId: user!.id,
      entityId: eId,
      mediaType: isVideo ? "videos" : "images",
      filename: `${uniqueId}.${ext}`,
    });

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: s3Key,
      ContentType: fileType,
    });

    // Generate presigned URL valid for 15 minutes
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

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
