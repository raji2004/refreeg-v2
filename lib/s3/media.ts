/**
 * Resolves a media key or URL into a displayable URL.
 * If the input is an S3 key, it returns the proxy API URL.
 * If it's already a full URL, it returns it as is.
 */
export function getMediaUrl(key: string | null | undefined): string {
  if (!key) return "";

  // If it's a full URL (http/https), or a local blob/data URL, return it as is
  if (
    key.startsWith("http://") ||
    key.startsWith("https://") ||
    key.startsWith("blob:") ||
    key.startsWith("data:")
  ) {
    return key;
  }

  // Otherwise assume it's an S3 key and use our proxy
  return `/api/s3/image?key=${encodeURIComponent(key)}`;
}

/**
 * Checks if a resolved media URL goes through the internal S3 proxy.
 * Next.js Image optimizer cannot follow redirects from internal API routes,
 * so these images must be marked as `unoptimized` when used with next/image.
 */
export function isProxyMediaUrl(url: string): boolean {
  return url.startsWith("/api/s3/image");
}
