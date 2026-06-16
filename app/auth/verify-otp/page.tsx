"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, ArrowLeft, MailCheck } from "lucide-react";

export default function VerifyOtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    if (!email) {
      router.push("/auth/signup");
    }
  }, [email, router]);

  const handleChange = (index: number, value: string) => {
    if (!/^[0-9]*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .replace(/[^0-9]/g, "")
      .substring(0, 6);
    if (pastedData) {
      const newOtp = [...otp];
      for (let i = 0; i < pastedData.length; i++) {
        newOtp[i] = pastedData[i];
      }
      setOtp(newOtp);
      const focusIndex = pastedData.length < 6 ? pastedData.length : 5;
      inputRefs[focusIndex].current?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join("");

    if (otpCode.length !== 6) {
      toast.error("Please enter the full 6-digit code");
      return;
    }

    setIsVerifying(true);

    try {
      // 1. Verify OTP with the backend
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otpCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Verification failed");
        setIsVerifying(false);
        return;
      }

      toast.success("Email verified successfully!");

      // 2. Auto login using the secure token returned from the backend
      if (data.loginToken) {
        const loginRes = await signIn("otp-login", {
          email,
          token: data.loginToken,
          redirect: false,
        });

        if (loginRes?.error) {
          toast.error("Auto-login failed, please sign in manually.");
          router.push(
            `/auth/signin?email=${encodeURIComponent(email)}&verified=true`,
          );
        } else {
          router.push("/onboarding");
        }
      } else {
        router.push(
          `/auth/signin?email=${encodeURIComponent(email)}&verified=true`,
        );
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      setIsVerifying(false);
    }
  };

  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0) return;

    setIsResending(true);
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
      toast.error("An unexpected error occurred while resending");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4 sm:p-6 relative overflow-hidden">
      {/* Background accents for a premium feel */}
      <div className="absolute top-[-5%] right-[-5%] w-[50%] h-[50%] bg-blue-50 rounded-full blur-[120px] pointer-events-none opacity-60" />
      <div className="absolute bottom-[-5%] left-[-5%] w-[50%] h-[50%] bg-slate-100 rounded-full blur-[120px] pointer-events-none opacity-60" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[440px] relative z-10"
      >
        <Link
          href="/auth/signup"
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-[#002B5B] transition-colors mb-6 sm:mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Back to Sign Up
        </Link>

        <div className="bg-white border border-slate-200 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 shadow-[0_20px_70px_-10px_rgba(0,0,0,0.08)]">
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#002B5B]/5 rounded-2xl sm:rounded-3xl flex items-center justify-center border border-[#002B5B]/10 shadow-sm">
              <MailCheck className="w-8 h-8 sm:w-10 sm:h-10 text-[#002B5B]" />
            </div>
          </div>

          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2 sm:mb-3 tracking-tight">
              Verify your email
            </h1>
            <p className="text-slate-500 text-sm sm:text-base leading-relaxed px-2">
              We've sent a 6-digit verification code to
              <br />
              <span className="text-[#002B5B] font-semibold break-all">
                {email}
              </span>
            </p>
          </div>

          <form onSubmit={handleVerify}>
            <div className="flex justify-between gap-2 sm:gap-3 mb-8 sm:mb-10">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={inputRefs[index]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="flex-1 min-w-0 h-12 sm:h-16 text-center text-xl sm:text-2xl font-bold bg-slate-50 border border-[#002B5B] rounded-xl sm:rounded-2xl text-slate-900 focus:border-[#002B5B] focus:ring-4 focus:ring-[#002B5B]/10 transition-all outline-none"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isVerifying || otp.join("").length !== 6}
              className="w-full h-12 sm:h-14 bg-[#002B5B] text-white hover:bg-[#001D3D] shadow-lg shadow-[#002B5B]/20 font-bold rounded-xl sm:rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mb-6 active:scale-[0.98]"
            >
              {isVerifying ? (
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
              ) : (
                "Verify and Continue"
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="text-xs sm:text-sm text-slate-500">
              Didn't receive the code?{" "}
              <button
                onClick={handleResend}
                disabled={isResending || cooldown > 0}
                className="text-[#002B5B] hover:text-blue-700 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline underline underline-offset-4"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend now"}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
