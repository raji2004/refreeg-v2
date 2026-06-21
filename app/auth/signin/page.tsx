"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";
import { AuthTestimonials } from "@/components/ui/auth-testimonials";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingType, setLoadingType] = useState<"manual" | "google" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const hasShownAuthNotice = useRef(false);

  useEffect(() => {
    // Prefetch common post-login routes
    router.prefetch("/petitions");
    router.prefetch("/dashboard");
  }, [router]);

  useEffect(() => {
    if (redirectTo && !hasShownAuthNotice.current) {
      toast({
        title: "Sign in required",
        description: "You need to log in first to continue.",
      });
      hasShownAuthNotice.current = true;
    }
  }, [redirectTo]);

  const handleGoogleSignIn = async () => {
    try {
      setLoadingType("google");
      await signInWithGoogle(redirectTo);
    } catch (error) {
      console.error("Google Sign In Error:", error);
      setLoadingType(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingType("manual");

    toast({
      title: "Signing you in...",
      description: "Please wait while we authenticate your account.",
    });

    try {
      await signIn(email, password, redirectTo);
    } catch (error) {
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="flex h-screen w-screen">
      <div className="flex md:w-2/5 w-full flex-col items-center justify-center bg-white px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center md:text-left">
            <h1 className="text-2xl md:text-4xl font-bold text-neutral-800">
              Welcome back
            </h1>
            <p className="mt-2 text-sm md:text-lg text-neutral-600">
              Sign in to your account
            </p>
          </div>

          {redirectTo && (
            <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              You need to log in first to continue.
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <LabelInputContainer>
                <Label htmlFor="email">Email</Label>
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
            <div className="mb-6">
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
                      <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </LabelInputContainer>
              <div className="mt-2 text-right">
                <Link
                  href="/auth/reset-password"
                  className="text-sm text-neutral-600 hover:text-neutral-800"
                >
                  Forgot Password?
                </Link>
              </div>
            </div>

            <Button
              className="group/btn relative h-10 w-full rounded-md font-medium text-white shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] flex items-center justify-center gap-2"
              type="submit"
              disabled={loadingType !== null}
              variant="default"
            >
              {loadingType === "manual" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Sign In"
              )}
              <BottomGradient />
            </Button>

            <div className="my-2 h-[1px] w-full bg-gradient-to-r from-transparent via-neutral-300 to-transparent" />

            <div className="flex flex-col space-y-4">
              <button
                className="group/btn shadow-input relative flex h-10 w-full items-center justify-center space-x-2 rounded-md bg-gray-50 px-4 font-medium text-black disabled:opacity-50"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loadingType !== null}
              >
                {loadingType === "google" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-neutral-700" />
                ) : (
                  <>
                    <Image
                      src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                      alt="Google logo"
                      width={18}
                      height={18}
                    />
                    <span className="text-sm text-neutral-700">Google</span>
                  </>
                )}
                <BottomGradient />
              </button>
            </div>

            <div className="mt-6 text-center text-sm text-neutral-600">
              Don&apos;t have an account?{" "}
              <Link
                href={redirectTo ? `/auth/signup?redirect=${encodeURIComponent(redirectTo)}` : "/auth/signup"}
                className="font-medium text-black hover:underline"
              >
                Sign Up Now
              </Link>
            </div>
            <div className="mt-2 text-sm text-center text-neutral-600">
              By signing in, you agree to our{" "}
              <Link
                href="/terms"
                className="font-medium text-black hover:underline"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="font-medium text-black hover:underline"
              >
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

const BottomGradient = () => {
  return (
    <>
      <span className="absolute inset-x-0 -bottom-px block h-px w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
      <span className="absolute inset-x-10 -bottom-px mx-auto block h-px w-1/2 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 blur-sm transition duration-500 group-hover/btn:opacity-100" />
    </>
  );
};

const LabelInputContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex w-full flex-col space-y-2", className)}>
      {children}
    </div>
  );
};
