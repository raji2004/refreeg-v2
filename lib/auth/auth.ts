import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/types/role-types";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";

// Idle timeout: session cookie/JWT expiry, renewed on activity (sliding window).
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
// How often the sliding window is renewed while the user is active.
const SESSION_UPDATE_AGE_SECONDS = 60 * 60 * 24; // 1 day
// Absolute cap on a session's lifetime, regardless of activity, so a
// continuously-active session cannot renew itself forever.
const ABSOLUTE_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

async function resolveUserRole(userId: string): Promise<UserRole> {
  const role = await prisma.role.findFirst({
    where: { user_id: userId },
    select: { role: true },
  });

  return (role?.role as UserRole) || "user";
}

function parseUserRole(role: unknown): UserRole | undefined {
  if (role === "admin" || role === "manager" || role === "user") {
    return role;
  }
  return undefined;
}

/**
 * Derive a human-readable device label from the browser's User-Agent.
 */
function getDeviceLabel(userAgent: string | null): string {
  if (!userAgent) return "Unknown Device";
  if (/android/i.test(userAgent)) return "Android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";
  if (/mac os x/i.test(userAgent)) return "Mac";
  if (/windows/i.test(userAgent)) return "Windows";
  if (/linux/i.test(userAgent)) return "Linux";
  return "Unknown Device";
}

// Wrap PrismaAdapter to map NextAuth's default `name`/`image` fields
// to our schema's `fullName`/`profilePhoto` fields
const baseAdapter = PrismaAdapter(prisma);
const customAdapter: Adapter = {
  ...baseAdapter,
  createUser: async (data: any) => {
    const { name, image, ...rest } = data;
    const user = await prisma.user.create({
      data: {
        ...rest,
        fullName: name || null,
        profilePhoto: image || null,
      },
    });
    return user as unknown as AdapterUser;
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: customAdapter,
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      id: "otp-login",
      name: "OTP Auto Login",
      credentials: {
        email: { label: "Email", type: "email" },
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.token) return null;

        const tokenStr = credentials.token as string;
        const secret = process.env.AUTH_SECRET || "fallback_secret";

        try {
          // Token format: base64(email):timestamp:hmac
          const [b64Email, timestamp, hmac] = tokenStr.split(":");
          if (!b64Email || !timestamp || !hmac) return null;

          const email = Buffer.from(b64Email, "base64").toString("utf-8");
          if (email !== credentials.email) return null;

          // Expire after 5 minutes
          if (Date.now() - parseInt(timestamp) > 5 * 60 * 1000) return null;

          const encoder = new TextEncoder();
          const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"],
          );
          const signature = await crypto.subtle.sign(
            "HMAC",
            key,
            encoder.encode(`${b64Email}:${timestamp}`),
          );
          const expectedHmac = Array.from(new Uint8Array(signature))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

          if (expectedHmac !== hmac) return null;

          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user) return null;

          return { 
            id: user.id, 
            email: user.email, 
            name: user.fullName,
            onboarding_completed: user.onboarding_completed 
          };
        } catch (error) {
          console.error("Auto login token verification failed", error);
          return null;
        }
      },
    }),
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.error(`[NextAuth] authorize called with email: ${credentials?.email}`);
        if (!credentials?.email || !credentials?.password) {
          console.error(`[NextAuth] missing credentials`);
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
            include: { roles: { select: { role: true } } },
          });

        if (!user) {
          console.error(`[NextAuth] user not found for email: ${credentials.email}`);
          return null;
        }
        if (!user.password) {
          console.error(`[NextAuth] user has no password for email: ${credentials.email}`);
          return null;
        }

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password,
        );

        if (!valid) {
          console.error(`[NextAuth] password mismatch for email: ${credentials.email}`);
          return null;
        }

        console.error(`[NextAuth] user authenticated successfully: ${credentials.email}`);
        return { 
          id: user.id, 
          email: user.email, 
          name: user.fullName,
          onboarding_completed: user.onboarding_completed,
          roles: user.roles,
          role: user.roles?.[0]?.role || "user",
          tier: user.current_tier || "Explorer",
        };
        } catch (error) {
          console.error("[NextAuth] ERROR in authorize:", error);
          return null;
        }
      },
    }),
  ],
  events: {
    async signIn({ user }) {
      if (user.email) {
        try {
          const reqHeaders = await headers();
          const userAgent = reqHeaders.get("user-agent");
          const protocol =
            process.env.NODE_ENV === "production" ? "https" : "http";
          const host = reqHeaders.get("host") || "localhost:3000";

          // Fire and forget so we don't block the login request
          fetch(`${protocol}://${host}/api/auth/login-notify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: user.email,
              userName: user.name,
              loginTime: new Date().toLocaleString(),
              device: getDeviceLabel(userAgent),
              userAgent: userAgent,
            }),
          }).catch((e) => console.error("Login notification API error:", e));
        } catch (e) {
          console.error("Login notification prep error:", e);
        }
      }
    },
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Enforce an absolute session lifetime regardless of activity, so a
      // continuously-active session can't renew its sliding window forever.
      // Returning null here invalidates the token and clears the cookie.
      if (
        !user &&
        typeof token.loginTime === "number" &&
        Date.now() - token.loginTime > ABSOLUTE_SESSION_MAX_AGE_MS
      ) {
        return null;
      }

      const userId = user?.id;
      if (userId) {
        // Stamp the original sign-in time; this persists across token
        // refreshes since we only set it when a fresh `user` is present.
        token.loginTime = Date.now();
        token.id = userId;
        token.onboardingCompleted = (user as any).onboarding_completed;

        // If the role was already fetched during credentials authorize, use it
        if ((user as any).role) {
          token.role = (user as any).role;
          token.tier = (user as any).tier;
        } else {
          try {
            // Attempt to fetch fresh profile data for OAuth...
            const dbUser = await prisma.user.findUnique({
              where: { id: userId },
              select: { roles: { select: { role: true } }, current_tier: true },
            });
            token.role = dbUser?.roles?.[0]?.role || "user";
            token.tier = dbUser?.current_tier || "Explorer";
          } catch (error) {
            console.error("[NextAuth] ERROR in jwt callback fetching dbUser:", error);
            token.role = "user";
            token.tier = "Explorer";
          }
        }
      }
      // Handle session updates from the client
      if (trigger === "update" && session?.onboardingCompleted !== undefined) {
        token.onboardingCompleted = session.onboardingCompleted;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).onboardingCompleted = token.onboardingCompleted;
        session.user.role = parseUserRole(token.role);
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    newUser: "/onboarding",
  },
});
