"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Timer, Mail } from "lucide-react";

import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AuthLogo } from "@/components/auth/auth-logo";
import { BeatOtpInput } from "@/components/ui/beat-otp-input";
import { Button } from "@/components/ui/button";

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const requestedRedirect = searchParams.get("redirect");
  const safeRedirect =
    requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//")
      ? requestedRedirect
      : null;

  const [otpCode, setOtpCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (!email) {
      router.push("/auth/signup");
    }
  }, [email, router]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const executeVerify = async (codeToVerify: string) => {
    if (codeToVerify.length !== 6) {
      setErrorMessage("Please enter the full 6-character code");
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otpCode: codeToVerify }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg =
          data.error || "That code doesn't match. Please try again.";
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
        setIsVerifying(false);
        return;
      }

      toast.success("Account verified successfully!");

      if (data.loginToken) {
        const loginRes = await signIn("otp-login", {
          email,
          token: data.loginToken,
          redirect: false,
        });

        if (loginRes?.error) {
          toast.error("Auto-login failed, please sign in manually.");
          router.push(
            `/auth/signin?email=${encodeURIComponent(email)}&verified=true${safeRedirect ? `&redirect=${encodeURIComponent(safeRedirect)}` : ""}`,
          );
        } else {
          router.push(
            safeRedirect
              ? `/onboarding?redirect=${encodeURIComponent(safeRedirect)}`
              : "/onboarding",
          );
        }
      } else {
        router.push(
          `/auth/signin?email=${encodeURIComponent(email)}&verified=true${safeRedirect ? `&redirect=${encodeURIComponent(safeRedirect)}` : ""}`,
        );
      }
    } catch (error) {
      setErrorMessage("An unexpected network error occurred.");
      toast.error("An unexpected error occurred");
      setIsVerifying(false);
    }
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeVerify(otpCode);
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;

    setIsResending(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to resend code");
      } else {
        toast.success("A new code has been sent to your email.");
        setCooldown(60);
      }
    } catch (error) {
      toast.error("An error occurred while resending the code");
    } finally {
      setIsResending(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? `0${secs}` : secs}`;
  };

  return (
    <div className="flex min-h-screen w-full bg-[#FCFBFA]">
      {}
      <AuthBrandPanel
        headline="One code, three characters at a time."
        subtitle="Letters and numbers, read in two beats. Paste it whole or type it — we strip spaces and the dash for you."
        bottomCard={{
          eyebrow: "WHAT WE SENT",
          text: `RefreeG: your 6-digit verification code was sent to ${email || "your email"}. It expires in 10 minutes. We will never ask you for it.`,
        }}
      />

      {/* Right Content Panel */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-10 sm:px-10 lg:px-16">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="mb-6 lg:hidden">
            <AuthLogo variant="dark" />
          </div>

          {/* Stepper Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold tracking-wide text-neutral-900 whitespace-nowrap">
                Step 2 of 3
              </span>
              <div className="h-1 flex-1 bg-neutral-200 rounded-full overflow-hidden">
                <div className="h-full w-2/3 bg-blue-600 rounded-full transition-all duration-300" />
              </div>
            </div>
          </div>

          {/* Screen Title & Target Email */}
          <div className="mb-8">
            <h1 className="font-fraunces text-3xl sm:text-4xl font-normal text-neutral-900 tracking-tight">
              Enter your code
            </h1>
            <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
              Sent to{" "}
              <span className="font-medium text-neutral-900">{email}</span> ·{" "}
              <Link
                href={`/auth/signup?email=${encodeURIComponent(email)}`}
                className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Change email
              </Link>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleVerifySubmit} className="space-y-6">
            {/* Reusable Beat OTP Component */}
            <div>
              <BeatOtpInput
                value={otpCode}
                onChange={(val) => {
                  setOtpCode(val);
                  setErrorMessage(null);
                }}
                onComplete={(code) => executeVerify(code)}
                error={errorMessage}
                disabled={isVerifying}
                autoFocus
                placeholder="K4T9PQ"
                onPasteSuccess={() => {
                  toast.success("Code pasted from clipboard");
                }}
              />
            </div>

            {/* Resend Cooldown Counter */}
            <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-500">
              <Timer className="w-4 h-4 shrink-0 text-neutral-400" />
              {cooldown > 0 ? (
                <span>Resend code in {formatTimer(cooldown)}</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isResending ? "Sending new code..." : "Resend code now"}
                </button>
              )}
            </div>

            {/* Primary Action Button */}
            <Button
              type="submit"
              disabled={isVerifying || otpCode.length !== 6}
              className="w-full h-13 rounded-2xl bg-[#0D1E16] text-white hover:bg-neutral-900 font-medium text-sm sm:text-base shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isVerifying ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Verify and continue"
              )}
            </Button>

            {/* Secondary Resend / Contact Action */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending || cooldown > 0}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-neutral-500 hover:text-neutral-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Send it by email instead</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-screen bg-[#FCFBFA]" />}>
      <VerifyOtpContent />
    </Suspense>
  );
}
