"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ShieldCheck } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { AlreadySignedInCard } from "@/components/auth/already-signed-in-card";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AuthField } from "@/components/auth/auth-field";
import { AuthLogo } from "@/components/auth/auth-logo";
import { SocialSignInButtons } from "@/components/auth/social-sign-in-buttons";

function normalizeRedirect(target: string | null): string | null {
  if (!target || !target.startsWith("/") || target.startsWith("//"))
    return null;
  return target;
}

function SignInContent() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loadingType, setLoadingType] = useState<
    "manual" | "google" | "apple" | null
  >(null);
  const { user, isLoading, signIn, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const hasShownAuthNotice = useRef(false);

  const setFormFields = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    router.prefetch("/petitions");
    router.prefetch("/dashboard");
    router.prefetch("/auth/signup");
    router.prefetch("/auth/signup/organization");
    router.prefetch("/auth/reset-password");
  }, [router]);

  useEffect(() => {
    if (user) return;
    if (redirectTo && !hasShownAuthNotice.current) {
      toast({
        title: "Sign in required",
        description: "You need to log in first to continue.",
      });
      hasShownAuthNotice.current = true;
    }
  }, [redirectTo, user]);

  const handleGoogleSignIn = async () => {
    try {
      setLoadingType("google");
      await signInWithGoogle(redirectTo);
    } catch (error) {
      console.error("Google Sign In Error:", error);
      setLoadingType(null);
    }
  };

  const handleAppleSignIn = () => {
    toast({
      title: "Apple Sign In",
      description:
        "Apple sign in is coming soon. Please continue with Google or Email.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.email.trim() || !form.password) {
      toast({
        title: "Missing fields",
        description: "Please enter both your email address and password.",
        variant: "destructive",
      });
      return;
    }

    setLoadingType("manual");

    toast({
      title: "Signing you in...",
      description: "Please wait while we authenticate your account.",
    });

    try {
      await signIn(form.email.trim().toLowerCase(), form.password, redirectTo);
    } catch (error: any) {
      console.error("Sign in failed:", error);
    } finally {
      setLoadingType(null);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen w-screen bg-cream-soft" />;
  }

  if (user) {
    return (
      <div className="flex min-h-screen w-screen bg-white">
        <div className="flex md:w-1/2 w-full flex-col items-center justify-center bg-white px-6 py-10 md:px-10">
          <AlreadySignedInCard
            name={user.name}
            email={user.email}
            redirectTo={normalizeRedirect(redirectTo) || "/dashboard"}
            variant="signin"
          />
        </div>
        <AuthBrandPanel
          headline="Welcome back to transparent impact."
          subtitle="Every donation tracked, every receipt verified. Continue supporting campaigns that matter."
          checklist={[
            {
              title: "Real-time updates",
              description: "Follow the causes and petitions you care about.",
            },
            {
              title: "Verified receipts",
              description:
                "View milestone verifications and project disbursements.",
            },
            {
              title: "100% transparent",
              description: "Direct accountability for every backed initiative.",
            },
          ]}
          testimonial={{
            avatarInitials: "TA",
            quote:
              "I can always see the exact progress and milestone proof of every project I've backed.",
            author: "Tunde A. · Lagos",
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-cream-soft">
      {}
      <AuthBrandPanel
        headline="Welcome back to transparent impact."
        subtitle="Every donation tracked, every receipt verified. Continue supporting campaigns that matter."
        checklist={[
          {
            title: "Real-time updates",
            description: "Follow the causes and petitions you care about.",
          },
          {
            title: "Verified receipts",
            description:
              "View milestone verifications and project disbursements.",
          },
          {
            title: "100% transparent",
            description: "Direct accountability for every backed initiative.",
          },
        ]}
        testimonial={{
          avatarInitials: "TA",
          quote:
            "I can always see the exact progress and milestone proof of every project I've backed.",
          author: "Tunde A. · Lagos",
        }}
      />

      {}
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-10 sm:px-10 lg:px-16">
        <div className="w-full max-w-lg">
          {}
          <div className="mb-6 lg:hidden">
            <AuthLogo variant="dark" />
          </div>

          {}
          <div className="mb-7">
            <h1 className="font-fraunces text-3xl sm:text-4xl font-normal text-neutral-900 tracking-tight">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Don&apos;t have an account?{" "}
              <Link
                href={
                  redirectTo
                    ? `/auth/signup?redirect=${encodeURIComponent(redirectTo)}`
                    : "/auth/signup"
                }
                className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Sign up
              </Link>
            </p>
          </div>

          {/* Notice banner if redirected */}
          {redirectTo && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              You need to log in first to continue.
            </div>
          )}

          <SocialSignInButtons
            disabled={loadingType !== null}
            googleLoading={loadingType === "google"}
            onGoogle={handleGoogleSignIn}
            onApple={handleAppleSignIn}
          />

          {/* Divider */}
          <div className="relative my-7 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <span className="relative bg-cream-soft px-3 text-[11px] font-bold uppercase tracking-widest text-neutral-400">
              Or use your email
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AuthField
              id="email"
              type="email"
              label="Email Address"
              placeholder="name@example.com"
              value={form.email}
              onChange={(e) => setFormFields("email", e.target.value)}
              required
            />
            <AuthField
              id="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setFormFields("password", e.target.value)}
              required
              labelAction={
                <Link
                  href="/auth/reset-password"
                  className="text-xs font-medium text-neutral-500 hover:text-neutral-900 hover:underline transition-colors"
                >
                  Forgot Password?
                </Link>
              }
            />

            {/* Submit Action Button */}
            <div className="pt-2">
              <Button
                type="submit"
                aria-label="Sign In"
                disabled={loadingType !== null}
                className="w-full h-13 rounded-2xl bg-forest-deep text-white hover:bg-neutral-900 font-medium text-sm sm:text-base shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loadingType === "manual" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Sign In"
                )}
              </Button>
            </div>

            {/* Trust badge with shield icon */}
            <div className="pt-2 flex items-start gap-2 text-xs text-neutral-500 leading-relaxed">
              <ShieldCheck className="w-4 h-4 shrink-0 text-neutral-400 mt-0.5" />
              <span>
                Protected by end-to-end cryptographic verification. Your data is
                never shared.
              </span>
            </div>

            {/* Terms and Privacy policy note */}
            <div className="pt-2 text-center text-xs text-neutral-500 leading-relaxed">
              By signing in, you agree to our{" "}
              <Link
                href="/terms"
                target="_blank"
                className="font-medium text-neutral-700 hover:underline"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                target="_blank"
                className="font-medium text-neutral-700 hover:underline"
              >
                Privacy Policy
              </Link>
              .
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen w-screen bg-cream-soft" />}
    >
      <SignInContent />
    </Suspense>
  );
}
