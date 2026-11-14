import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/types/role-types";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { createReferralRecord } from "@/lib/referral-utils";
import { deriveFullNameFromEmail } from "@/lib/auth/registration";
import { timingSafeEqual } from "crypto";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const SESSION_UPDATE_AGE_SECONDS = 60 * 60 * 24;

const ABSOLUTE_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

const SESSIONS_INVALIDATED_AFTER_MS = process.env.SESSIONS_INVALIDATED_AFTER
  ? new Date(process.env.SESSIONS_INVALIDATED_AFTER).getTime()
  : null;

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

function getDeviceLabel(userAgent: string | null): string {
  if (!userAgent) return "Unknown Device";
  if (/android/i.test(userAgent)) return "Android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";
  if (/mac os x/i.test(userAgent)) return "Mac";
  if (/windows/i.test(userAgent)) return "Windows";
  if (/linux/i.test(userAgent)) return "Linux";
  return "Unknown Device";
}

const LOGIN_MAX_FAILED_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MINUTES = 15;

const baseAdapter = PrismaAdapter(prisma);
const customAdapter: Adapter = {
  ...baseAdapter,
  createUser: async (data: any) => {
    const { name, image, ...rest } = data;
    const effectiveName =
      name || (rest.email ? deriveFullNameFromEmail(rest.email) : null);
    const [firstName, ...lastNameParts] = (effectiveName || "")
      .trim()
      .split(/\s+/);
    const user = await prisma.user.create({
      data: {
        ...rest,
        fullName: effectiveName,
        profilePhoto: image || null,
        firstName: firstName || null,
        lastName: lastNameParts.length ? lastNameParts.join(" ") : null,
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
      // No allowDangerousEmailAccountLinking: an OAuth identity that merely
      // shares an email with a local account must never sign in as it
      // without proving ownership of the original credentials.
    }),
    ...(process.env.APPLE_ID && process.env.APPLE_SECRET
      ? [
          Apple({
            clientId: process.env.APPLE_ID,
            clientSecret: process.env.APPLE_SECRET,
          }),
        ]
      : []),
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
        const secret = process.env.AUTH_SECRET;
        if (!secret) throw new Error("AUTH_SECRET is not set");

        try {
          const [b64Email, timestamp, hmac] = tokenStr.split(":");
          if (!b64Email || !timestamp || !hmac) return null;

          const email = Buffer.from(b64Email, "base64").toString("utf-8");
          if (email !== credentials.email) return null;

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

          const a = Buffer.from(expectedHmac);
          const b = Buffer.from(hmac);
          if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.fullName,
            onboarding_completed: user.onboarding_completed,
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
        if (!credentials?.email || !credentials?.password) {
          console.info(
            "[NextAuth] Missing credentials during sign-in attempt.",
          );
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
            include: { roles: { select: { role: true } } },
          });

          if (!user) {
            console.info("[NextAuth] Sign-in attempt for unregistered email.");
            return null;
          }
          if (!user.password) {
            console.info("[NextAuth] User has no password set.");
            return null;
          }

          // Lock out repeated failures against one account so stolen or
          // guessed passwords cannot be cycled indefinitely (SAW-007).
          if (
            user.locked_until &&
            new Date(user.locked_until).getTime() > Date.now()
          ) {
            console.warn(
              `[NextAuth] Login refused: account locked until ${user.locked_until.toISOString()}`,
            );
            return null;
          }

          const valid = await bcrypt.compare(
            credentials.password as string,
            user.password,
          );

          if (!valid) {
            console.info("[NextAuth] Invalid password attempt.");
            const attempts = (user.failed_login_attempts ?? 0) + 1;
            const lock =
              attempts >= LOGIN_MAX_FAILED_ATTEMPTS
                ? new Date(Date.now() + LOGIN_LOCKOUT_MINUTES * 60 * 1000)
                : null;
            await prisma.user.update({
              where: { id: user.id },
              data: {
                failed_login_attempts: lock ? 0 : attempts,
                ...(lock ? { locked_until: lock } : {}),
              },
            });
            return null;
          }

          if (user.failed_login_attempts > 0 || user.locked_until) {
            await prisma.user.update({
              where: { id: user.id },
              data: { failed_login_attempts: 0, locked_until: null },
            });
          }

          console.info("[NextAuth] User authenticated successfully.");

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

          const refV1Cookie = reqHeaders
            .get("cookie")
            ?.split(";")
            .map((c) => c.trim())
            .find((c) => c.startsWith("ref_v1="))
            ?.split("=")[1];

          if (refV1Cookie && user.id) {
            const dbUser = await prisma.user.findUnique({
              where: { id: user.id },
              select: { createdAt: true, email: true },
            });

            const isNewUser =
              dbUser?.createdAt &&
              Date.now() - new Date(dbUser.createdAt).getTime() < 10_000;

            if (isNewUser) {
              createReferralRecord({
                referralCode: refV1Cookie,
                newUserId: user.id,
                email: user.email,
              }).catch((e) =>
                console.error("[OAuth] createReferralRecord error:", e),
              );
            }
          }
        } catch (e) {
          console.error("Login notification prep error:", e);
        }
      }
    },
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (
        !user &&
        typeof token.loginTime === "number" &&
        Date.now() - token.loginTime > ABSOLUTE_SESSION_MAX_AGE_MS
      ) {
        return null;
      }

      if (
        !user &&
        SESSIONS_INVALIDATED_AFTER_MS != null &&
        typeof token.loginTime === "number" &&
        token.loginTime < SESSIONS_INVALIDATED_AFTER_MS
      ) {
        return null;
      }

      // Per-user revocation cutoff (sessions_invalidated_after). The dashboard
      // layout checked this, but API routes and server actions did not, so a
      // revoked session kept working against APIs. Skipped on the Edge
      // runtime (middleware), where Prisma cannot execute.
      if (!user && token.id && process.env.NEXT_RUNTIME === "nodejs") {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { sessions_invalidated_after: true },
          });
          const revokedAfter = dbUser?.sessions_invalidated_after;
          if (
            revokedAfter &&
            typeof token.loginTime === "number" &&
            new Date(revokedAfter).getTime() > token.loginTime
          ) {
            return null;
          }
        } catch (error) {
          console.error("[NextAuth] Per-user revocation check failed:", error);
        }
      }

      const userId = user?.id;
      if (userId) {
        token.loginTime = Date.now();
        token.id = userId;
        token.onboardingCompleted = (user as any).onboarding_completed;

        if ((user as any).role) {
          token.role = (user as any).role;
          token.tier = (user as any).tier;
        } else {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: userId },
              select: { roles: { select: { role: true } }, current_tier: true },
            });
            token.role = dbUser?.roles?.[0]?.role || "user";
            token.tier = dbUser?.current_tier || "Explorer";
          } catch (error) {
            console.error(
              "[NextAuth] ERROR in jwt callback fetching dbUser:",
              error,
            );
            token.role = "user";
            token.tier = "Explorer";
          }
        }
      }

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

        (session.user as any).loginTime = token.loginTime;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    newUser: "/onboarding",
  },
});
