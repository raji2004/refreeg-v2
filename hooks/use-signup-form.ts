"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "nextjs-toploader/app";
import { useAuth } from "@/hooks/use-auth";
import { useValidator } from "@/hooks/use-validator";
import { toast } from "@/components/ui/use-toast";
import { normalizeRegistrationInput } from "@/lib/auth/registration";
import type { SignupAccountType } from "@/lib/auth/registration";
import {
  getSignupErrors,
  signupSchema,
  type SignupFields,
} from "@/lib/schemas/registration.schema";

export type SignupCopy = {
  accountType: SignupAccountType;
  /** The other sign-up page, prefetched alongside the OTP page. */
  prefetchPath: string;
  creating: { title: string; description: string };
  codeSentDescription: string;
  reviewDescription: string;
  fallbackError: string;
  /** Marks a Google sign-in as an organization sign-up (read on the callback). */
  markOrganizationIntent?: boolean;
};

type Tracking = {
  referralCode: string | null;
  redirect: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
};

function isSafeRedirect(target: string | null): target is string {
  return !!target && target.startsWith("/") && !target.startsWith("//");
}

export function useSignupForm(copy: SignupCopy) {
  const router = useRouter();
  const { user, signInWithGoogle } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: true,
  });
  const [loadingType, setLoadingType] = useState<
    "manual" | "google" | "apple" | null
  >(null);
  const [tracking, setTracking] = useState<Tracking>({
    referralCode: null,
    redirect: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
  });
  const { errors, validate, clearError } = useValidator({
    store: form,
    schema: signupSchema,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    setTracking({
      referralCode: params.get("ref_v1") || null,
      redirect: isSafeRedirect(redirect) ? redirect : null,
      utmSource: params.get("utm_source"),
      utmMedium: params.get("utm_medium"),
      utmCampaign: params.get("utm_campaign"),
    });

    router.prefetch("/auth/verify-otp");
    router.prefetch(copy.prefetchPath);
  }, [router, copy.prefetchPath]);

  const setFormFields = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key !== "agreeTerms") clearError(key as keyof SignupFields);
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoadingType("google");
      if (copy.markOrganizationIntent) {
        document.cookie =
          "auth_org_intent=true; path=/; max-age=600; SameSite=Lax";
      }
      await signInWithGoogle(tracking.redirect);
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!form.agreeTerms) {
      toast({
        title: "Terms required",
        description: "Please accept the terms and privacy policy to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!validate()) {
      const found = getSignupErrors(form, copy.accountType);
      if (found.password) {
        toast({
          title: "Password Error",
          description: found.password,
          variant: "destructive",
        });
      } else if (found.confirmPassword) {
        toast({
          title: "Password Mismatch",
          description: found.confirmPassword,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Please review the highlighted fields",
          description: copy.reviewDescription,
          variant: "destructive",
        });
      }
      return;
    }

    const registration = normalizeRegistrationInput({
      accountType: copy.accountType,
      email: form.email,
      password: form.password,
      confirmPassword: form.confirmPassword,
    });

    setLoadingType("manual");
    toast(copy.creating);

    try {
      const response = await fetch("/api/auth/register-pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...registration,
          confirmPassword: undefined,
          referralCode: tracking.referralCode,
          utm_source: tracking.utmSource,
          utm_medium: tracking.utmMedium,
          utm_campaign: tracking.utmCampaign,
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
        description: copy.codeSentDescription,
      });

      const redirectParam = tracking.redirect
        ? `&redirect=${encodeURIComponent(tracking.redirect)}`
        : "";
      router.push(
        `/auth/verify-otp?email=${encodeURIComponent(registration.email)}${redirectParam}`,
      );
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error && error.message
            ? error.message
            : copy.fallbackError,
        variant: "destructive",
      });
    } finally {
      setLoadingType(null);
    }
  };

  return {
    user,
    form,
    setFormFields,
    errors,
    loadingType,
    redirect: tracking.redirect,
    handleGoogleSignIn,
    handleAppleSignIn,
    handleSubmit,
  };
}
