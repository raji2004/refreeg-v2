import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "./s3-client";

export const getBucketName = () => {
  const bucketName = process.env.AWS_S3_BUCKET;
  if (!bucketName) {
    throw new Error("AWS_S3_BUCKET environment variable is not set");
  }
  return bucketName;
};

export type S3EntityType = "profiles" | "causes" | "petitions" | "kyc";
export type S3MediaType = "images" | "videos" | "documents";

export function generateS3Key(params: {
  entityType: S3EntityType;
  userId: string;
  entityId?: string;
  mediaType: S3MediaType;
  filename: string;
}) {
  const { entityType, userId, entityId, mediaType, filename } = params;
  
  // Base: uploads/entity/userId
  let parts = ["uploads", entityType, userId];
  
  // Add entityId if provided (for causes, petitions, kyc)
  if (entityId) {
    parts.push(entityId);
  }
  
  // Add mediaType and filename
  parts.push(mediaType, filename);
  
  return parts.join("/");
}

/**
 * Uploads a file buffer directly to S3.
 * Used primary for server-side uploads (e.g. migration script)
 */
export async function uploadToS3(buffer: Buffer, key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  return s3Client.send(command);
}

/**
 * Generates a presigned URL to securely download a private object from S3.
 * Default expiration is 1 hour (3600 seconds)
 */
export async function generatePresignedGetUrl(key: string, expiresIn = 3600) {
  // If the key is already a full URL (e.g., from old supabase or placeholder), return it
  if (key.startsWith('http://') || key.startsWith('https://')) {
    return key;
  }

  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generates a presigned URL to allow direct file upload to S3 from the browser.
 * Default expiration is 15 minutes (900 seconds)
 */
export async function generatePresignedPutUrl(key: string, contentType: string, expiresIn = 900) {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}
