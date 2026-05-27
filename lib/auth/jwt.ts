import * as jose from "jose";

// Fallback secret for development if not provided in env
const SECRET = process.env.AUTH_SECRET || "development-secret-key-123456789";
const encodedSecret = new TextEncoder().encode(SECRET);

export interface MobileJwtPayload {
  userId: string;
  email: string;
  exp?: number;
}

/**
 * Sign a new JWT token for a mobile user
 * Expires in 30 days
 */
export async function signMobileToken(userId: string, email: string): Promise<string> {
  const jwt = await new jose.SignJWT({ userId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(encodedSecret);

  return jwt;
}

/**
 * Verify a mobile JWT token
 * Returns the payload if valid, throws if invalid or expired
 */
export async function verifyMobileToken(token: string): Promise<MobileJwtPayload> {
  try {
    const { payload } = await jose.jwtVerify(token, encodedSecret);
    return payload as unknown as MobileJwtPayload;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}

/**
 * Refresh an existing mobile token
 * Issues a new token with a fresh 30-day expiration if the current one is valid
 */
export async function refreshMobileToken(token: string): Promise<string> {
  const payload = await verifyMobileToken(token);
  return signMobileToken(payload.userId, payload.email);
}
