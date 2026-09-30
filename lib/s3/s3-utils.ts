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

  let parts = ["uploads", entityType, userId];

  if (entityId) {
    parts.push(entityId);
  }

  parts.push(mediaType, filename);

  return parts.join("/");
}

export async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string,
) {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  return s3Client.send(command);
}

export async function generatePresignedGetUrl(key: string, expiresIn = 3600) {
  if (key.startsWith("http://") || key.startsWith("https://")) {
    return key;
  }

  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

export async function generatePresignedPutUrl(
  key: string,
  contentType: string,
  expiresIn = 900,
) {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}
