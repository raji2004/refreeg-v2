import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/types/role-types";

declare module "next-auth" {
  interface Session {
    onboardingCompleted?: boolean;
    user: DefaultSession["user"] & {
      id: string;
      onboardingCompleted?: boolean;
      role?: UserRole;
    };
  }

  interface User {
    onboarding_completed?: boolean | null;
    user_metadata?: {
      avatar_url?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    onboardingCompleted?: boolean | null;
    role?: UserRole;
    tier?: string;
    /** Epoch ms when this session was originally created; used to enforce an absolute session lifetime. */
    loginTime?: number;
  }
}
