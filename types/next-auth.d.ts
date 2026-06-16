import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    onboardingCompleted?: boolean;
    user: DefaultSession["user"] & {
      id: string;
      onboardingCompleted?: boolean;
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
  }
}
