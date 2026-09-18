"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { AlreadySignedInCard } from "@/components/auth/already-signed-in-card";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AuthLogo } from "@/components/auth/auth-logo";

function normalizeRedirect(target: string | null): string | null {
  if (!target || !target.startsWith("/") || target.startsWith("//")) return null;
  return target;
}

function SignInContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingType, setLoadingType] = useState<"manual" | "google" | "apple" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { user, isLoading, signIn, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const hasShownAuthNotice = useRef(false);

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
      description: "Apple sign in is coming soon. Please continue with Google or Email.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
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
      await signIn(email.trim().toLowerCase(), password, redirectTo);
    } catch (error: any) {
      // Handled in useAuth, but if unhandled:
      console.error("Sign in failed:", error);
    } finally {
      setLoadingType(null);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen w-screen bg-[#FCFBFA]" />;
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
              description: "View milestone verifications and project disbursements.",
            },
            {
              title: "100% transparent",
              description: "Direct accountability for every backed initiative.",
            },
          ]}
          testimonial={{
            avatarInitials: "TA",
            quote: "I can always see the exact progress and milestone proof of every project I've backed.",
            author: "Tunde A. · Lagos",
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-[#FCFBFA]">
      {/* Left Brand Panel (Desktop) */}
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
            description: "View milestone verifications and project disbursements.",
          },
          {
            title: "100% transparent",
            description: "Direct accountability for every backed initiative.",
          },
        ]}
        testimonial={{
          avatarInitials: "TA",
          quote: "I can always see the exact progress and milestone proof of every project I've backed.",
          author: "Tunde A. · Lagos",
        }}
      />

      {/* Right Form Panel */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-10 sm:px-10 lg:px-16">
        <div className="w-full max-w-lg">
          {/* Mobile Logo */}
          <div className="mb-6 lg:hidden">
            <AuthLogo variant="dark" />
          </div>

          {/* Screen Title & Subtitle */}
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
            <p className="mt-1 text-sm text-neutral-600">
              Registering as an organization?{" "}
              <Link
                href="/auth/signup/organization"
                className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Create an organization account
              </Link>
            </p>
          </div>

          {/* Notice banner if redirected */}
          {redirectTo && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              You need to log in first to continue.
            </div>
          )}

          {/* Social Sign In */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loadingType !== null}
              className="w-full h-12 flex items-center justify-center gap-3 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 shadow-sm text-sm font-medium text-neutral-800 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {loadingType === "google" ? (
                <Loader2 className="h-4 w-4 animate-spin text-neutral-700" />
              ) : (
                <>
                  <Image
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    width={18}
                    height={18}
                    alt="Google"
                    className="shrink-0"
                  />
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleAppleSignIn}
              disabled={loadingType !== null}
              className="w-full h-12 flex items-center justify-center gap-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 shadow-sm text-sm font-medium text-neutral-800 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 170 170"
                fill="currentColor"
                className="shrink-0"
              >
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.7-7.94-12.04-14.58-6.19-9.52-11.04-20.17-14.55-31.96-3.51-11.78-5.27-23.04-5.27-33.77 0-14.33 3.66-26.11 10.98-35.34 7.32-9.23 16.5-13.9 27.54-14.02 5.06 0 10.43 1.25 16.12 3.75 5.68 2.5 9.77 3.81 12.26 3.93 1.93-.12 6.13-1.49 12.61-4.11 6.48-2.62 11.96-3.84 16.44-3.65 12.44.63 22.39 5.25 29.85 13.86-10.87 6.64-16.18 15.65-15.93 27.03.26 8.94 3.74 16.5 10.45 22.68 6.7 6.18 14.68 9.77 23.94 10.77-1.93 5.92-4.15 11.66-6.66 17.23zM119.22 33.56c0-6.73 2.45-13.11 7.35-19.14 4.9-6.03 11.02-9.98 18.36-11.86.87 3.37 1.08 6.47.63 9.31-.7 4.49-2.73 9.07-6.09 13.74-3.36 4.67-7.46 7.97-12.3 9.9-1.99.8-3.79 1.15-5.4 1.05-.33-1-.62-2.02-.85-3.05-.62-2.82-.93-5.29-.93-7.42z" />
              </svg>
              <span>Continue with Apple</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-7 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <span className="relative bg-[#FCFBFA] px-3 text-[11px] font-bold uppercase tracking-widest text-neutral-400">
              Or use your email
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Address */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600"
              >
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-xl bg-[#F0EEE9]/70 border border-neutral-200/80 px-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-blue-600 transition-colors"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600"
                >
                  Password
                </label>
                <Link
                  href="/auth/reset-password"
                  className="text-xs font-medium text-neutral-500 hover:text-neutral-900 hover:underline transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 rounded-xl bg-[#F0EEE9]/70 border border-neutral-200/80 px-4 pr-11 text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-blue-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 bottom-0 px-3.5 flex items-center text-neutral-400 hover:text-neutral-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Action Button */}
            <div className="pt-2">
              <Button
                type="submit"
                aria-label="Sign In"
                disabled={loadingType !== null}
                className="w-full h-13 rounded-2xl bg-[#0D1E16] text-white hover:bg-neutral-900 font-medium text-sm sm:text-base shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
                Protected by end-to-end cryptographic verification. Your data is never shared.
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
    <Suspense fallback={<div className="min-h-screen w-screen bg-[#FCFBFA]" />}>
      <SignInContent />
    </Suspense>
  );
}
