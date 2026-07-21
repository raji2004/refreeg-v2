import type { S3EntityType, S3MediaType } from "@/lib/s3/s3-utils";

export type PresignUploadOptions = {
  entityType: S3EntityType;
  entityId?: string;
  mediaType: S3MediaType;
};

/**
 * Prefer direct browser → S3 PUT when CORS allows it
 * (NEXT_PUBLIC_S3_DIRECT_UPLOAD=true). Otherwise upload via
 * authenticated /api/s3/upload (works on localhost without bucket CORS).
 */
export async function uploadFileWithPresign(
  file: File,
  options: PresignUploadOptions,
): Promise<{ key: string }> {
  const preferDirect =
    process.env.NEXT_PUBLIC_S3_DIRECT_UPLOAD === "true";

  if (preferDirect) {
    try {
      return await uploadViaPresignedPut(file, options);
    } catch (error) {
      console.warn(
        "Direct S3 PUT failed; falling back to server upload:",
        error,
      );
    }
  }

  return uploadViaServer(file, options);
}

async function uploadViaServer(
  file: File,
  options: PresignUploadOptions,
): Promise<{ key: string }> {
  const form = new FormData();
  form.append("file", file);
  form.append("entityType", options.entityType);
  form.append("mediaType", options.mediaType);
  if (options.entityId) form.append("entityId", options.entityId);

  const res = await fetch("/api/s3/upload", {
    method: "POST",
    body: form,
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      body?.error || `Server upload failed (${res.status})`,
    );
  }

  if (!body?.key) {
    throw new Error("Invalid upload response");
  }

  return { key: body.key as string };
}

async function uploadViaPresignedPut(
  file: File,
  options: PresignUploadOptions,
): Promise<{ key: string }> {
  const presignRes = await fetch("/api/s3/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      entityType: options.entityType,
      entityId: options.entityId,
      mediaType: options.mediaType,
      fileSize: file.size,
    }),
  });

  const presignBody = await presignRes.json().catch(() => null);
  if (!presignRes.ok) {
    throw new Error(
      presignBody?.error || `Failed to get upload URL (${presignRes.status})`,
    );
  }

  const { uploadUrl, key } = presignBody as {
    uploadUrl: string;
    key: string;
  };

  if (!uploadUrl || !key) {
    throw new Error("Invalid presign response");
  }

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error(
      `S3 upload failed (${putRes.status}). Check bucket CORS allows PUT from this origin.`,
    );
  }

  return { key };
}

/**
 * Resolves gallery items so videos are S3 keys and images remain File
 * objects for the existing server-action path.
 */
export async function resolveMultimediaForSubmit(
  items: (File | string)[],
  options: { entityType: S3EntityType; entityId?: string },
): Promise<(File | string)[]> {
  const resolved: (File | string)[] = [];

  for (const item of items) {
    if (typeof item === "string") {
      resolved.push(item);
      continue;
    }

    if (item.type.startsWith("video/")) {
      const { key } = await uploadFileWithPresign(item, {
        entityType: options.entityType,
        entityId: options.entityId,
        mediaType: "videos",
      });
      resolved.push(key);
    } else {
      resolved.push(item);
    }
  }

  return resolved;
}
