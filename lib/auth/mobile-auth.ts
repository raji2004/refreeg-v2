import { NextRequest } from "next/server";
import { verifyMobileToken } from "./jwt";
import { prisma } from "@/lib/prisma";
import { apiError } from "../api/response";

export interface MobileAuthResult {
  user?: {
    id: string;
    email: string;
    fullName: string | null;
  };
  errorResponse?: Response;
}

/**
 * Authenticates a mobile API request using the Bearer token.
 * Validates the token and fetches the user from the database.
 * 
 * Returns an object with either the `user` or an `errorResponse` that can be returned directly.
 */
export async function authenticateMobileRequest(
  request: NextRequest
): Promise<MobileAuthResult> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      errorResponse: apiError("Missing or invalid authorization header", 401),
    };
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return {
      errorResponse: apiError("Token not provided", 401),
    };
  }

  try {
    const payload = await verifyMobileToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
      },
    });

    if (!user || !user.email) {
      return {
        errorResponse: apiError("User not found or invalid", 401),
      };
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
    };
  } catch (error) {
    return {
      errorResponse: apiError("Invalid or expired token", 401),
    };
  }
}
