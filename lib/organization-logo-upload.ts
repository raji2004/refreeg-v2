import { updateOrganizationLogo } from "@/actions/organization-actions";
import { uploadFileWithPresign } from "@/lib/s3/upload-client";

const LOGO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export async function uploadOrganizationLogo(file: File) {
  if (!LOGO_TYPES.has(file.type)) {
    return {
      success: false as const,
      error: "Logo must be a JPG, PNG, or WebP image.",
    };
  }
  if (file.size === 0 || file.size > MAX_LOGO_BYTES) {
    return {
      success: false as const,
      error: "Logo must be smaller than 2 MB.",
    };
  }

  try {
    const { key } = await uploadFileWithPresign(file, {
      entityType: "organizations",
      mediaType: "images",
    });
    return await updateOrganizationLogo(key);
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Unable to upload logo.",
    };
  }
}
