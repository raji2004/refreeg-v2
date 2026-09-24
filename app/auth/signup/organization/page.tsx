"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { AlreadySignedInCard } from "@/components/auth/already-signed-in-card";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AuthLogo } from "@/components/auth/auth-logo";
import {
  normalizeRegistrationInput,
  type RegistrationErrors,
  validateRegistrationInput,
} from "@/lib/auth/registration";

function normalizeRedirect(target: string | null): string | null {
  if (!target || !target.startsWith("/") || target.startsWith("//"))
    return null;
  return target;
}

export default function OrganizationSignUpPage() {
  const router = useRouter();
  const { user, isLoading, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loadingType, setLoadingType] = useState<
    "manual" | "google" | "apple" | null
  >(null);
  const [refV1FromUrl, setRefV1FromUrl] = useState<string | null>(null);
  const [redirectFromUrl, setRedirectFromUrl] = useState<string | null>(null);
  const [utmSource, setUtmSource] = useState<string | null>(null);
  const [utmMedium, setUtmMedium] = useState<string | null>(null);
  const [utmCampaign, setUtmCampaign] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const refV1 = params.get("ref_v1");
      if (refV1) setRefV1FromUrl(refV1);
      const redirect = params.get("redirect");
      if (redirect?.startsWith("/") && !redirect.startsWith("//")) {
        setRedirectFromUrl(redirect);
      }
      setUtmSource(params.get("utm_source"));
      setUtmMedium(params.get("utm_medium"));
      setUtmCampaign(params.get("utm_campaign"));

      router.prefetch("/auth/verify-otp");
      router.prefetch("/auth/signup");
    }
  }, [router]);

  const clearError = (field: keyof RegistrationErrors) => {
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoadingType("google");
      if (typeof document !== "undefined") {
        document.cookie =
          "auth_org_intent=true; path=/; max-age=600; SameSite=Lax";
      }
      await signInWithGoogle(redirectFromUrl);
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

    if (!agreeTerms) {
      toast({
        title: "Terms required",
        description: "Please accept the terms and privacy policy to continue.",
        variant: "destructive",
      });
      return;
    }

    const registration = normalizeRegistrationInput({
      accountType: "organization",
      email,
      password,
      confirmPassword,
    });

    const validationErrors = validateRegistrationInput(registration);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      if (validationErrors.password) {
        toast({
          title: "Password Error",
          description: validationErrors.password,
          variant: "destructive",
        });
      } else if (validationErrors.confirmPassword) {
        toast({
          title: "Password Mismatch",
          description: validationErrors.confirmPassword,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Please review the highlighted fields",
          description: "Correct the organization details and try again.",
          variant: "destructive",
        });
      }
      return;
    }

    setLoadingType("manual");

    toast({
      title: "Creating organization account...",
      description: "Setting up your workspace.",
    });

    try {
      const response = await fetch("/api/auth/register-pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...registration,
          confirmPassword: undefined,
          referralCode: refV1FromUrl,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          user_agent:
            typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to initiate registration");
      }

      toast({
        title: "Check your email!",
        description: "We've sent a 6-digit code to verify your admin email.",
      });

      const redirectParam = redirectFromUrl
        ? `&redirect=${encodeURIComponent(redirectFromUrl)}`
        : "";
      router.push(
        `/auth/verify-otp?email=${encodeURIComponent(registration.email)}${redirectParam}`,
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Could not create organization account",
        variant: "destructive",
      });
    } finally {
      setLoadingType(null);
    }
  };

  if (user) {
    return (
      <div className="flex min-h-screen w-screen bg-white">
        <div className="flex md:w-1/2 w-full flex-col items-center justify-center bg-white px-6 py-10 md:px-10">
          <AlreadySignedInCard
            name={user.name}
            email={user.email}
            redirectTo={normalizeRedirect(redirectFromUrl) || "/dashboard"}
            variant="signup"
          />
        </div>
        <AuthBrandPanel
          headline="Built for verified, transparent impact."
          subtitle="Empower your organization with verifiable disbursement milestones and real-time public accounting."
          checklist={[
            {
              title: "Transparent accountability",
              description:
                "Publish proof of impact before project tranches unlock.",
            },
            {
              title: "Community trust & pledges",
              description:
                "Pledges are only charged when milestones are verified.",
            },
            {
              title: "Instant verification",
              description:
                "Admin workspace ready immediately after email confirmation.",
            },
          ]}
          testimonial={{
            avatarInitials: "HI",
            quote:
              "RefreeG gave our NGO the transparency we needed to raise funds with absolute credibility.",
            author: "Hope Initiative · Abuja",
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-[#FCFBFA]">
      {/* Left Brand Panel (Desktop) */}
      <AuthBrandPanel
        headline="Built for verified, transparent impact."
        subtitle="Empower your organization with verifiable disbursement milestones and real-time public accounting."
        checklist={[
          {
            title: "Transparent accountability",
            description:
              "Publish proof of impact before project tranches unlock.",
          },
          {
            title: "Community trust & pledges",
            description:
              "Pledges are only charged when milestones are verified.",
          },
          {
            title: "Instant verification",
            description:
              "Admin workspace ready immediately after email confirmation.",
          },
        ]}
        testimonial={{
          avatarInitials: "HI",
          quote:
            "RefreeG gave our NGO the transparency we needed to raise funds with absolute credibility.",
          author: "Hope Initiative · Abuja",
        }}
      />

      {/* Right Form Panel */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-10 sm:px-10 lg:px-16">
        <div className="w-full max-w-lg">
          {/* Mobile Logo */}
          <div className="mb-6 lg:hidden">
            <AuthLogo variant="dark" />
          </div>

          {/* Stepper Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold tracking-wide text-neutral-900 whitespace-nowrap">
                Step 1 of 3
              </span>
              <div className="h-1 flex-1 bg-neutral-200 rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-blue-600 rounded-full" />
              </div>
            </div>
          </div>

          {/* Screen Title & Subtitle */}
          <div className="mb-7">
            <h1 className="font-fraunces text-3xl sm:text-4xl font-normal text-neutral-900 tracking-tight">
              Create an organization account
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Already have one?{" "}
              <Link
                href="/auth/signin"
                className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Sign in
              </Link>
            </p>
            <p className="mt-1 text-sm text-neutral-600">
              Signing up as an individual?{" "}
              <Link
                href="/auth/signup"
                className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Sign up here
              </Link>
            </p>
          </div>

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
              Or register with Org email
            </span>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Admin Email Address */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600"
              >
                Org Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="admin@organization.org"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError("email");
                }}
                aria-invalid={!!errors.email}
                className={cn(
                  "h-12 rounded-xl bg-[#F0EEE9]/70 border border-neutral-200/80 px-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-blue-600 transition-colors",
                  errors.email && "border-red-500 bg-red-50/20",
                )}
              />
              {errors.email && (
                <p role="alert" className="text-xs text-red-600 mt-1">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600"
              >
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearError("password");
                  }}
                  aria-invalid={!!errors.password}
                  className={cn(
                    "h-12 rounded-xl bg-[#F0EEE9]/70 border border-neutral-200/80 px-4 pr-11 text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-blue-600 transition-colors",
                    errors.password && "border-red-500 bg-red-50/20",
                  )}
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

              {errors.password && (
                <p role="alert" className="text-xs text-red-600 mt-1">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600"
              >
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    clearError("confirmPassword");
                  }}
                  aria-invalid={!!errors.confirmPassword}
                  className={cn(
                    "h-12 rounded-xl bg-[#F0EEE9]/70 border border-neutral-200/80 px-4 pr-11 text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-blue-600 transition-colors",
                    errors.confirmPassword && "border-red-500 bg-red-50/20",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-0 top-0 bottom-0 px-3.5 flex items-center text-neutral-400 hover:text-neutral-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {errors.confirmPassword && (
                <p role="alert" className="text-xs text-red-600 mt-1">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Agreement Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-neutral-300 text-[#0D1E16] focus:ring-[#0D1E16] cursor-pointer"
                />
                <span className="text-xs text-neutral-600 leading-relaxed">
                  I agree to the{" "}
                  <Link
                    href="/terms"
                    target="_blank"
                    className="font-semibold text-neutral-900 hover:underline"
                  >
                    terms
                  </Link>{" "}
                  and the{" "}
                  <Link
                    href="/privacy"
                    target="_blank"
                    className="font-semibold text-neutral-900 hover:underline"
                  >
                    privacy policy
                  </Link>
                  .
                </span>
              </label>
            </div>

            {/* Submit Action Button */}
            <div className="pt-2">
              <Button
                type="submit"
                aria-label="Create organization account"
                disabled={loadingType !== null}
                className="w-full h-13 rounded-2xl bg-[#0D1E16] text-white hover:bg-neutral-900 font-medium text-sm sm:text-base shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loadingType === "manual" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Send me a code"
                )}
              </Button>
            </div>

            {/* Trust badge with shield icon */}
            <div className="pt-2 flex items-start gap-2 text-xs text-neutral-500 leading-relaxed">
              <ShieldCheck className="w-4 h-4 shrink-0 text-neutral-400 mt-0.5" />
              <span>
                Your email secures your workspace and verifies organization
                actions. It is never shown publicly.
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
