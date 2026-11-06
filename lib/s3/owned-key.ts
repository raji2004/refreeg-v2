import type { S3EntityType } from "@/lib/s3/s3-utils";

// Keys issued by /api/s3/presign start with uploads/{entityType}/{userId}/[entityId/].
export function isOwnUploadKey(
  key: unknown,
  entityType: S3EntityType,
  userId: string,
  entityId?: string,
): key is string {
  if (typeof key !== "string" || key.includes("..")) return false;
  const prefix = [
    "uploads",
    entityType,
    userId,
    ...(entityId ? [entityId] : []),
  ]
    .join("/")
    .concat("/");
  return key.startsWith(prefix);
}
