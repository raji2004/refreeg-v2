"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  UserRound,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/use-auth";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { AuthTestimonials } from "@/components/ui/auth-testimonials";
import {
  getPasswordErrors,
  normalizeRegistrationInput,
  PASSWORD_REQUIREMENTS,
  type RegistrationErrors,
  type SignupAccountType,
  validateRegistrationInput,
} from "@/lib/auth/registration";

export default function SignUpPage() {
  const router = useRouter();
  const { signInWithGoogle } = useAuth();

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
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loadingType, setLoadingType] = useState<"manual" | "google" | null>(
    null,
  );
  const [refV1FromUrl, setRefV1FromUrl] = useState<string | null>(null);
  const [redirectFromUrl, setRedirectFromUrl] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const refV1 = params.get("ref_v1");
      if (refV1) setRefV1FromUrl(refV1);
      const redirect = params.get("redirect");
      if (redirect?.startsWith("/") && !redirect.startsWith("//")) {
        setRedirectFromUrl(redirect);
      }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

  return (
    <div className="flex min-h-screen w-screen bg-white">
      <div className="flex md:w-1/2 w-full flex-col items-center overflow-y-auto bg-white px-6 py-10 md:px-10">
        <div className="my-auto w-full max-w-xl">
          <div className="mb-6 text-center md:text-left">
            <h1 className="text-2xl md:text-4xl font-bold text-neutral-800">
              Welcome to RefreeG
            </h1>
            <p className="mt-2 text-sm md:text-lg text-neutral-600">
              {accountType === "organization"
                ? "Create an organization workspace and owner account"
                : "Create an account to start fundraising or donating"}
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <fieldset className="mb-5">
              <legend className="mb-2 text-sm font-medium text-neutral-800">
                Account Type
              </legend>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    id: "individual" as const,
                    label: "Individual",
                    description: "For personal fundraising and giving",
                    icon: UserRound,
                  },
                  {
                    id: "organization" as const,
                    label: "Organization",
                    description: "For teams, nonprofits, and businesses",
                    icon: Building2,
                  },
                ].map((option) => {
                  const Icon = option.icon;
                  const selected = accountType === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setAccountType(option.id);
                        setErrors({});
                      }}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-colors",
                        selected
                          ? "border-blue-600 bg-blue-50 text-blue-900"
                          : "border-neutral-200 hover:border-blue-300",
                      )}
                    >
                      <Icon className="mb-2 h-5 w-5" />
                      <span className="block text-sm font-semibold">
                        {option.label}
                      </span>
                      <span className="mt-1 block text-xs text-neutral-500">
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="mb-4">
              <LabelInputContainer>
                <Label htmlFor="fullName">
                  {accountType === "organization"
                    ? "Admin / Primary Contact Name"
                    : "Full Name"}
                </Label>
                <Input
                  id="fullName"
                  placeholder={
                    accountType === "organization"
                      ? "Name of the workspace owner"
                      : "Your full name"
                  }
                  value={fullName}
                  onChange={(event) => {
                    setFullName(event.target.value);
                    clearError("fullName");
                  }}
                  aria-invalid={!!errors.fullName}
                  className={cn(errors.fullName && "border-red-500")}
                />
                <FieldError message={errors.fullName} />
              </LabelInputContainer>
            </div>

            {accountType === "organization" && (
              <div className="mb-4 grid gap-4 sm:grid-cols-2">
                <LabelInputContainer>
                  <Label htmlFor="organizationName">Organization Name</Label>
                  <Input
                    id="organizationName"
                    placeholder="Hope & Health Initiative"
                    value={organizationName}
                    onChange={(event) => {
                      setOrganizationName(event.target.value);
                      clearError("organizationName");
                    }}
                    aria-invalid={!!errors.organizationName}
                    className={cn(errors.organizationName && "border-red-500")}
                  />
                  <FieldError message={errors.organizationName} />
                </LabelInputContainer>

                <LabelInputContainer>
                  <Label htmlFor="organizationIndustry">Industry</Label>
                  <Input
                    id="organizationIndustry"
                    placeholder="Healthcare, Education, Nonprofit..."
                    value={organizationIndustry}
                    onChange={(event) => {
                      setOrganizationIndustry(event.target.value);
                      clearError("organizationIndustry");
                    }}
                    aria-invalid={!!errors.organizationIndustry}
                    className={cn(
                      errors.organizationIndustry && "border-red-500",
                    )}
                  />
                  <FieldError message={errors.organizationIndustry} />
                </LabelInputContainer>

                <LabelInputContainer>
                  <Label htmlFor="organizationPhone">Organization Phone</Label>
                  <Input
                    id="organizationPhone"
                    type="tel"
                    placeholder="+234 801 234 5678"
                    value={organizationPhone}
                    onChange={(event) => {
                      setOrganizationPhone(event.target.value);
                      clearError("organizationPhone");
                    }}
                    aria-invalid={!!errors.organizationPhone}
                    className={cn(
                      errors.organizationPhone && "border-red-500",
                    )}
                  />
                  <FieldError message={errors.organizationPhone} />
                </LabelInputContainer>

                <LabelInputContainer>
                  <Label htmlFor="organizationAddress">
                    Organization Address
                  </Label>
                  <Input
                    id="organizationAddress"
                    placeholder="Street, city, country"
                    value={organizationAddress}
                    onChange={(event) => {
                      setOrganizationAddress(event.target.value);
                      clearError("organizationAddress");
                    }}
                    aria-invalid={!!errors.organizationAddress}
                    className={cn(
                      errors.organizationAddress && "border-red-500",
                    )}
                  />
                  <FieldError message={errors.organizationAddress} />
                </LabelInputContainer>
              </div>
            )}

            <div className="mb-4">
              <LabelInputContainer>
                <Label htmlFor="email">
                  {accountType === "organization"
                    ? "Admin Email Address"
                    : "Email Address"}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    clearError("email");
                  }}
                  aria-invalid={!!errors.email}
                  className={cn(errors.email && "border-red-500")}
                />
                <FieldError message={errors.email} />
              </LabelInputContainer>
            </div>

            <div className="mb-4">
              <LabelInputContainer>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      clearError("password");
                    }}
                    aria-invalid={!!errors.password}
                    className={cn(
                      "pr-10",
                      errors.password &&
                        "border-red-500 focus-visible:ring-red-500",
                    )}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                <div className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {PASSWORD_REQUIREMENTS.map((requirement) => {
                    const met =
                      password.length > 0 &&
                      !activePasswordErrors.includes(requirement);
                    return (
                      <p
                        key={requirement}
                        className={cn(
                          "flex items-center gap-1 text-xs",
                          password.length === 0
                            ? "text-gray-400"
                            : met
                              ? "text-green-600"
                              : "text-red-500",
                        )}
                      >
                        {met ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {requirement}
                      </p>
                    );
                  })}
                </div>
                <FieldError message={errors.password} />
              </LabelInputContainer>
            </div>

            <div className="mb-8">
              <LabelInputContainer>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      clearError("confirmPassword");
                    }}
                    aria-invalid={!!errors.confirmPassword}
                    className={cn(
                      "pr-10",
                      confirmPassword &&
                        password !== confirmPassword &&
                        "border-red-500 focus-visible:ring-red-500",
                    )}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>

                {confirmPassword && (
                  <p
                    className={cn(
                      "text-xs",
                      password === confirmPassword
                        ? "text-green-600"
                        : "text-red-500",
                    )}
                  >
                    {password === confirmPassword
                      ? "✓ Passwords match"
                      : "✗ Passwords do not match"}
                  </p>
                )}
                <FieldError message={errors.confirmPassword} />
              </LabelInputContainer>
            </div>

            <Button
              type="submit"
              disabled={loadingType !== null}
              className="group/btn relative h-10 w-full rounded-md font-medium text-white flex items-center justify-center gap-2"
            >
              {loadingType === "manual" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Sign Up"
              )}
              <BottomGradient />
            </Button>

            <div className="my-2 h-[1px] w-full bg-gradient-to-r from-transparent via-neutral-300 to-transparent" />

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loadingType !== null}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-gray-50 shadow-input disabled:opacity-50"
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
                  />
                  <span className="text-sm text-neutral-700">Google</span>
                </>
              )}
              <BottomGradient />
            </button>

            <div className="mt-6 text-center text-sm text-neutral-600">
              Already have an account?{" "}
              <Link href="/auth/signin" className="font-medium hover:underline">
                Sign In
              </Link>
            </div>

            <div className="mt-2 text-sm text-center text-neutral-600">
              By signing up, you agree to our{" "}
              <Link href="/terms" className="font-medium hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-medium hover:underline">
                Privacy Policy
              </Link>
            </div>
          </form>
        </div>
      </div>

      <div className="hidden md:flex md:w-1/2 items-center justify-center bg-[#003366] px-8">
        <AuthTestimonials />
      </div>
    </div>
  );
}

const BottomGradient = () => (
  <>
    <span className="absolute inset-x-0 -bottom-px block h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
  </>
);

const LabelInputContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("flex flex-col space-y-2", className)}>{children}</div>
);

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <p role="alert" className="text-xs text-red-600">
      {message}
    </p>
  ) : null;
