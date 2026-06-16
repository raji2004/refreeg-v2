import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";

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
  session: { strategy: "jwt" },
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
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user?.password) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password,
        );

        if (!valid) return null;

        return { 
          id: user.id, 
          email: user.email, 
          name: user.fullName,
          onboarding_completed: user.onboarding_completed
        };
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
      if (user) {
        token.id = user.id;
        // Onboarding status from the database
        token.onboardingCompleted = (user as any).onboarding_completed;
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
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    newUser: "/onboarding",
  },
});
