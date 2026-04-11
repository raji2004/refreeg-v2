"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

import { useAuth } from "@/hooks/use-auth";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { AuthTestimonials } from "@/components/ui/auth-testimonials";

export default function SignUpPage() {
  const supabase = createClient();
  const { signUp, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refV1FromUrl, setRefV1FromUrl] = useState<string | null>(null);
  const [utmSource, setUtmSource] = useState<string | null>(null);
  const [utmMedium, setUtmMedium] = useState<string | null>(null);
  const [utmCampaign, setUtmCampaign] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const refV1 = params.get("ref_v1");
      if (refV1) setRefV1FromUrl(refV1);

      const source = params.get("utm_source_v1") || params.get("utm_source");
      const medium = params.get("utm_medium_v1") || params.get("utm_medium");
      const campaign =
        params.get("utm_campaign_v1") || params.get("utm_campaign");

      if (source) setUtmSource(source);
      if (medium) setUtmMedium(medium);
      if (campaign) setUtmCampaign(campaign);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please confirm your password correctly.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    toast({
      title: "Creating your account...",
      description: "Setting up your RefreeG account.",
    });

    try {
      const signUpEmail = email.trim();
      const normalizedEmail = signUpEmail.toLowerCase();

      if (refV1FromUrl) {
        await supabase.functions.invoke("process-referral-v1", {
          body: {
            action: "create",
            referrer_id: refV1FromUrl,
            referee_email: normalizedEmail,
            utm_source: utmSource,
            utm_medium: utmMedium,
            utm_campaign: utmCampaign,
          },
        });
      }

      const result = await signUp(signUpEmail, password, "User", null);

      if (!result?.data?.user) {
        return;
      }

      if (refV1FromUrl) {
        await supabase.functions.invoke("process-referral-v1", {
          body: {
            action: "complete",
            referrer_id: refV1FromUrl,
            referee_email: normalizedEmail,
            referee_id: result.data.user.id,
          },
        });
      }

      toast({
        title: "Account created!",
        description: "Please verify your email to continue.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Could not create account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen">
      <div className="flex md:w-2/5 w-full flex-col items-center justify-center bg-white px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center md:text-left">
            <h1 className="text-2xl md:text-4xl font-bold text-neutral-800">
              Welcome to RefreeG
            </h1>
            <p className="mt-2 text-sm md:text-lg text-neutral-600">
              Create an account to start fundraising or donating
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <LabelInputContainer>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
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
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
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
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pr-10"
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
              </LabelInputContainer>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="group/btn relative h-10 w-full rounded-md font-medium text-white"
            >
              Sign Up
              <BottomGradient />
            </Button>

            <div className="my-2 h-[1px] w-full bg-gradient-to-r from-transparent via-neutral-300 to-transparent" />

            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={isLoading}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-gray-50 shadow-input"
            >
              <Image
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                width={18}
                height={18}
                alt="Google"
              />
              <span className="text-sm text-neutral-700">Google</span>
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

      <div className="hidden md:flex md:w-3/5 items-center justify-center bg-[#003366] px-8">
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
