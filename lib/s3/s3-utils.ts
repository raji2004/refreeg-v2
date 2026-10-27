import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
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

/**
 * Normalizes a stored media reference into a bucket-relative S3 key if it belongs
 * to our S3 uploads path, or returns null for external URLs (e.g. Google avatars).
 */
export function extractS3Key(rawUrlOrKey: string | null | undefined): string | null {
  if (!rawUrlOrKey) return null;
  const trimmed = rawUrlOrKey.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("uploads/")) {
    return trimmed.split("?")[0];
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      const pathWithoutLeadingSlash = decodeURIComponent(
        parsed.pathname.replace(/^\/+/, ""),
      );
      if (pathWithoutLeadingSlash.startsWith("uploads/")) {
        return pathWithoutLeadingSlash;
      }
    } catch {
      return null;
    }
  }

  return null;
}

export async function deleteS3Object(key: string): Promise<void> {
  const normalizedKey = extractS3Key(key);
  if (!normalizedKey || !process.env.AWS_S3_BUCKET) return;

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: normalizedKey,
    }),
  );
}

export async function deleteS3Prefix(prefix: string): Promise<number> {
  if (!process.env.AWS_S3_BUCKET || !prefix.startsWith("uploads/")) {
    return 0;
  }

  const bucket = getBucketName();
  let continuationToken: string | undefined;
  let deletedCount = 0;

  do {
    const listed = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    const objects =
      listed.Contents?.map((item) => item.Key)
        .filter((key): key is string => Boolean(key))
        .map((Key) => ({ Key })) ?? [];

    if (objects.length > 0) {
      await s3Client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: objects, Quiet: true },
        }),
      );
      deletedCount += objects.length;
    }

    continuationToken = listed.IsTruncated
      ? listed.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return deletedCount;
}

/**
 * Deletes all personal S3 objects tied to a user (profile photos, KYC documents,
 * and any explicit S3 keys passed in). Errors are logged without blocking DB cleanup.
 */
export async function deleteUserPersonalS3Files(
  userId: string,
  extraKeys: (string | null | undefined)[] = [],
): Promise<void> {
  if (!process.env.AWS_S3_BUCKET || !userId) return;

  const prefixes = [
    `uploads/profiles/${userId}/`,
    `uploads/kyc/${userId}/`,
  ];

  await Promise.allSettled([
    ...prefixes.map((prefix) => deleteS3Prefix(prefix)),
    ...extraKeys.map((key) => (key ? deleteS3Object(key) : Promise.resolve())),
  ]);
}
