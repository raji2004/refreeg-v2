export function getMediaUrl(key: string | null | undefined): string {
  if (!key) return "";

  if (
    key.startsWith("http://") ||
    key.startsWith("https://") ||
    key.startsWith("blob:") ||
    key.startsWith("data:") ||
    key.startsWith("/api/s3/image")
  ) {
    return key;
  }

  const isCauseImage =
    key.startsWith("uploads/causes/") && key.includes("/images/");
  return `/api/s3/image?key=${encodeURIComponent(key)}${
    isCauseImage ? "&presentation=clean-v3" : ""
  }`;
}

/**
 * Checks if a resolved media URL should skip the Next.js image optimizer.
 * The optimizer cannot follow /api/s3/image redirects, and S3 hosts vary by
 * bucket/region so they are safer rendered as-is.
 */
export function isProxyMediaUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("/api/s3/image")) return true;

  try {
    const hostname = new URL(url).hostname;
    return (
      hostname.includes("amazonaws.com") || hostname.includes("cloudfront.net")
    );
  } catch {
    return false;
  }
}
