"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { AlreadySignedInCard } from "@/components/auth/already-signed-in-card";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AuthLogo } from "@/components/auth/auth-logo";
import {
  getPasswordErrors,
  normalizeRegistrationInput,
  PASSWORD_REQUIREMENTS,
  type RegistrationErrors,
  type SignupAccountType,
  validateRegistrationInput,
} from "@/lib/auth/registration";

function normalizeRedirect(target: string | null): string | null {
  if (!target || !target.startsWith("/") || target.startsWith("//"))
    return null;
  return target;
}

export default function SignUpPage() {
  const router = useRouter();
  const { user, isLoading, signInWithGoogle } = useAuth();

  const [accountType, setAccountType] =
    useState<SignupAccountType>("individual");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationPhone, setOrganizationPhone] = useState("");
  const [organizationAddress, setOrganizationAddress] = useState("");
  const [organizationIndustry, setOrganizationIndustry] = useState("");
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
    }
  }, [router]);

  const clearError = (field: keyof RegistrationErrors) => {
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoadingType("google");
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
      accountType,
      fullName,
      email,
      password,
      confirmPassword,
      organizationName,
      organizationPhone,
      organizationAddress,
      organizationIndustry,
    });

    const validationErrors = validateRegistrationInput(registration);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast({
        title: "Please review the highlighted fields",
        description: "Correct the signup information and try again.",
        variant: "destructive",
      });
      return;
    }

    setLoadingType("manual");

    toast({
      title: "Creating your account...",
      description: "Setting up your RefreeG account.",
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
        description: "We've sent a 6-digit code to verify your email.",
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
        description: error?.message || "Could not create account",
        variant: "destructive",
      });
    } finally {
      setLoadingType(null);
    }
  };

  const activePasswordErrors = getPasswordErrors(password);

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
          headline="You'll see exactly where it went."
          subtitle="Two minutes to set up. Nothing is charged until you choose a campaign and an amount."
          checklist={[
            {
              title: "Receipts, not promises",
              description:
                "Organisers upload proof before the next tranche unlocks.",
            },
            {
              title: "Pledge now, pay on trigger",
              description:
                "Your card is only charged when a campaign can actually work.",
            },
            {
              title: "150 EIZA to start",
              description: "Credited once your email is verified.",
            },
          ]}
          testimonial={{
            avatarInitials: "NB",
            quote:
              "My aunt trades at Mile-12. She got the grant. I saw the receipt.",
            author: "Ngozi B. · Lagos",
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-[#FCFBFA]">
      {/* Left Brand Panel (Desktop) */}
      <AuthBrandPanel
        headline="You'll see exactly where it went."
        subtitle="Two minutes to set up. Nothing is charged until you choose a campaign and an amount."
        checklist={[
          {
            title: "Receipts, not promises",
            description:
              "Organisers upload proof before the next tranche unlocks.",
          },
          {
            title: "Pledge now, pay on trigger",
            description:
              "Your card is only charged when a campaign can actually work.",
          },
          {
            title: "150 EIZA to start",
            description: "Credited once your email is verified.",
          },
        ]}
        testimonial={{
          avatarInitials: "NB",
          quote:
            "My aunt trades at Mile-12. She got the grant. I saw the receipt.",
          author: "Ngozi B. · Lagos",
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
              Create your account
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
          </div>

          {/* Social Sign In (Google & Apple — Wallet removed per instruction) */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loadingType !== null}
              className="w-full h-12 flex items-center justify-center gap-3 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 shadow-sm text-sm font-medium text-neutral-800 transition-all active:scale-[0.99] disabled:opacity-50"
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
              className="w-full h-12 flex items-center justify-center gap-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 shadow-sm text-sm font-medium text-neutral-800 transition-all active:scale-[0.99] disabled:opacity-50"
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

          {/* Account Type Toggle */}
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 rounded-xl border border-neutral-200/70">
              <button
                type="button"
                aria-pressed={accountType === "individual"}
                onClick={() => {
                  setAccountType("individual");
                  setErrors({});
                }}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  accountType === "individual"
                    ? "bg-white text-neutral-900 shadow-sm border border-neutral-200/50"
                    : "text-neutral-500 hover:text-neutral-900",
                )}
              >
                <UserRound className="w-3.5 h-3.5" />
                <span>Individual</span>
              </button>
              <button
                type="button"
                aria-pressed={accountType === "organization"}
                onClick={() => {
                  setAccountType("organization");
                  setErrors({});
                }}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  accountType === "organization"
                    ? "bg-white text-neutral-900 shadow-sm border border-neutral-200/50"
                    : "text-neutral-500 hover:text-neutral-900",
                )}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Organization</span>
              </button>
            </div>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="fullName"
                className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600"
              >
                {accountType === "organization"
                  ? "Admin / Primary Contact Name"
                  : "Full Name"}
              </label>
              <Input
                id="fullName"
                placeholder={
                  accountType === "organization"
                    ? "Name of the workspace owner"
                    : "As it appears on your ID"
                }
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  clearError("fullName");
                }}
                aria-invalid={!!errors.fullName}
                className={cn(
                  "h-12 rounded-xl bg-[#F0EEE9]/70 border border-neutral-200/80 px-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-blue-600 transition-colors",
                  errors.fullName && "border-red-500 bg-red-50/20",
                )}
              />
              {errors.fullName && (
                <p role="alert" className="text-xs text-red-600 mt-1">
                  {errors.fullName}
                </p>
              )}
            </div>

            {/* Organization Specific Fields */}
            {accountType === "organization" && (
              <div className="space-y-4 pt-1 animate-in fade-in-50 duration-200">
                <div className="space-y-1.5">
                  <label
                    htmlFor="organizationName"
                    className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600"
                  >
                    Organization Name
                  </label>
                  <Input
                    id="organizationName"
                    placeholder="Hope & Health Initiative"
                    value={organizationName}
                    onChange={(e) => {
                      setOrganizationName(e.target.value);
                      clearError("organizationName");
                    }}
                    aria-invalid={!!errors.organizationName}
                    className={cn(
                      "h-12 rounded-xl bg-[#F0EEE9]/70 border border-neutral-200/80 px-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-blue-600 transition-colors",
                      errors.organizationName && "border-red-500 bg-red-50/20",
                    )}
                  />
                  {errors.organizationName && (
                    <p role="alert" className="text-xs text-red-600 mt-1">
                      {errors.organizationName}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="organizationIndustry"
                      className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600"
                    >
                      Industry
                    </label>
                    <Input
                      id="organizationIndustry"
                      placeholder="e.g. Healthcare, Education"
                      value={organizationIndustry}
                      onChange={(e) => {
                        setOrganizationIndustry(e.target.value);
                        clearError("organizationIndustry");
                      }}
                      aria-invalid={!!errors.organizationIndustry}
                      className={cn(
                        "h-12 rounded-xl bg-[#F0EEE9]/70 border border-neutral-200/80 px-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-blue-600 transition-colors",
                        errors.organizationIndustry &&
                          "border-red-500 bg-red-50/20",
                      )}
                    />
                    {errors.organizationIndustry && (
                      <p role="alert" className="text-xs text-red-600 mt-1">
                        {errors.organizationIndustry}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="organizationPhone"
                      className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600"
                    >
                      Organization Phone
                    </label>
                    <Input
                      id="organizationPhone"
                      type="tel"
                      placeholder="+234 801 234 5678"
                      value={organizationPhone}
                      onChange={(e) => {
                        setOrganizationPhone(e.target.value);
                        clearError("organizationPhone");
                      }}
                      aria-invalid={!!errors.organizationPhone}
                      className={cn(
                        "h-12 rounded-xl bg-[#F0EEE9]/70 border border-neutral-200/80 px-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-blue-600 transition-colors",
                        errors.organizationPhone &&
                          "border-red-500 bg-red-50/20",
                      )}
                    />
                    {errors.organizationPhone && (
                      <p role="alert" className="text-xs text-red-600 mt-1">
                        {errors.organizationPhone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="organizationAddress"
                    className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600"
                  >
                    Organization Address
                  </label>
                  <Input
                    id="organizationAddress"
                    placeholder="Street, City, State"
                    value={organizationAddress}
                    onChange={(e) => {
                      setOrganizationAddress(e.target.value);
                      clearError("organizationAddress");
                    }}
                    aria-invalid={!!errors.organizationAddress}
                    className={cn(
                      "h-12 rounded-xl bg-[#F0EEE9]/70 border border-neutral-200/80 px-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-blue-600 transition-colors",
                      errors.organizationAddress &&
                        "border-red-500 bg-red-50/20",
                    )}
                  />
                  {errors.organizationAddress && (
                    <p role="alert" className="text-xs text-red-600 mt-1">
                      {errors.organizationAddress}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Email Address (Replaces Phone Number per instruction) */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600"
              >
                {accountType === "organization"
                  ? "Admin Email Address"
                  : "Email Address"}
              </label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
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

              {/* Password Requirements */}
              <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1">
                {PASSWORD_REQUIREMENTS.map((req) => {
                  const isMet =
                    password.length > 0 && !activePasswordErrors.includes(req);
                  return (
                    <p
                      key={req}
                      className={cn(
                        "flex items-center gap-1.5 text-[11px] transition-colors",
                        password.length === 0
                          ? "text-neutral-400"
                          : isMet
                            ? "text-emerald-600 font-medium"
                            : "text-red-600",
                      )}
                    >
                      {isMet ? (
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                      ) : (
                        <XCircle className="w-3 h-3 shrink-0" />
                      )}
                      <span>{req}</span>
                    </p>
                  );
                })}
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
                    confirmPassword &&
                      password !== confirmPassword &&
                      "border-red-500 bg-red-50/20",
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

              {confirmPassword && (
                <p
                  className={cn(
                    "text-[11px] mt-1",
                    password === confirmPassword
                      ? "text-emerald-600 font-medium"
                      : "text-red-600",
                  )}
                >
                  {password === confirmPassword
                    ? "✓ Passwords match"
                    : "✗ Passwords do not match"}
                </p>
              )}

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
                aria-label="Sign Up"
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
                Your email secures your account and confirms petition
                signatures. It is never shown publicly.
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
