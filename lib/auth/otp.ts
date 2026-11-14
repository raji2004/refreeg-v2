import { createHmac, randomInt, timingSafeEqual } from "crypto";

// Signup OTPs are six digits - only a million possibilities - so the value
// stored server-side must not be reusable offline against a leaked database.
// We store HMAC-SHA256(code, AUTH_SECRET) and compare in constant time.
export function generateOtpCode(): string {
  // CSPRNG; Math.random() is predictable and must not mint codes.
  return randomInt(100000, 1000000).toString();
}

export function hashOtpCode(otp: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(otp).digest("hex");
}

export function otpMatches(submitted: string, storedHash: string): boolean {
  let submittedHash: string;
  try {
    submittedHash = hashOtpCode(submitted);
  } catch {
    return false;
  }
  const a = Buffer.from(submittedHash, "utf8");
  const b = Buffer.from(storedHash, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  return true;
}
