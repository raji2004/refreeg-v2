// Derive the client IP from proxy-set headers only.
//
// nginx sets X-Real-IP from $remote_addr, which a client cannot forge, so it
// is the first choice. Raw X-Forwarded-For chains are client-controlled: a
// direct client can inject arbitrary entries, so only the rightmost entry
// (appended by our own proxy) is trusted, never the first one.
export function getClientIp(headers: Headers): string | null {
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const entries = forwarded
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (entries.length > 0) return entries[entries.length - 1];
  }

  return null;
}
