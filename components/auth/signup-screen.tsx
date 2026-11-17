"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlreadySignedInCard } from "@/components/auth/already-signed-in-card";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AuthField } from "@/components/auth/auth-field";
import { AuthLogo } from "@/components/auth/auth-logo";
import { SocialSignInButtons } from "@/components/auth/social-sign-in-buttons";
import { useSignupForm, type SignupCopy } from "@/hooks/use-signup-form";

export type SignupVariant = SignupCopy & {
  brand: ComponentProps<typeof AuthBrandPanel>;
  title: string;
  switchPrompt: { text: string; linkLabel: string; href: string };
  divider: string;
  emailLabel: string;
  emailPlaceholder: string;
  submitAriaLabel: string;
  trustNote: string;
};

const linkClass =
  "font-semibold text-blue-600 hover:text-blue-700 hover:underline";

export function SignupScreen({ variant }: { variant: SignupVariant }) {
  const {
    user,
    form,
    setFormFields,
    errors,
    loadingType,
    redirect,
    handleGoogleSignIn,
    handleAppleSignIn,
    handleSubmit,
  } = useSignupForm(variant);

  if (user) {
    const target =
      redirect && redirect.startsWith("/") && !redirect.startsWith("//")
        ? redirect
        : "/dashboard";
    return (
      <div className="flex min-h-screen w-screen bg-white">
        <div className="flex md:w-1/2 w-full flex-col items-center justify-center bg-white px-6 py-10 md:px-10">
          <AlreadySignedInCard
            name={user.name}
            email={user.email}
            redirectTo={target}
            variant="signup"
          />
        </div>
        <AuthBrandPanel {...variant.brand} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-cream-soft">
      <AuthBrandPanel {...variant.brand} />

      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-10 sm:px-10 lg:px-16">
        <div className="w-full max-w-lg">
          <div className="mb-6 lg:hidden">
            <AuthLogo variant="dark" />
          </div>

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

          <div className="mb-7">
            <h1 className="font-fraunces text-3xl sm:text-4xl font-normal text-neutral-900 tracking-tight">
              {variant.title}
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Already have one?{" "}
              <Link href="/auth/signin" className={linkClass}>
                Sign in
              </Link>
            </p>
            <p className="mt-1 text-sm text-neutral-600">
              {variant.switchPrompt.text}{" "}
              <Link href={variant.switchPrompt.href} className={linkClass}>
                {variant.switchPrompt.linkLabel}
              </Link>
            </p>
          </div>

          <SocialSignInButtons
            disabled={loadingType !== null}
            googleLoading={loadingType === "google"}
            onGoogle={handleGoogleSignIn}
            onApple={handleAppleSignIn}
          />

          <div className="relative my-7 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <span className="relative bg-cream-soft px-3 text-[11px] font-bold uppercase tracking-widest text-neutral-400">
              {variant.divider}
            </span>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <AuthField
              id="email"
              type="email"
              label={variant.emailLabel}
              placeholder={variant.emailPlaceholder}
              value={form.email}
              onChange={(e) => setFormFields("email", e.target.value)}
              error={errors.email}
            />
            <AuthField
              id="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setFormFields("password", e.target.value)}
              error={errors.password}
            />
            <AuthField
              id="confirmPassword"
              type="password"
              label="Confirm Password"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={(e) => setFormFields("confirmPassword", e.target.value)}
              error={errors.confirmPassword}
            />

            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.agreeTerms}
                  onChange={(e) =>
                    setFormFields("agreeTerms", e.target.checked)
                  }
                  className="mt-1 h-4 w-4 rounded border-neutral-300 text-forest-deep focus:ring-forest-deep cursor-pointer"
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

            <div className="pt-2">
              <Button
                type="submit"
                aria-label={variant.submitAriaLabel}
                disabled={loadingType !== null}
                className="w-full h-13 rounded-2xl bg-forest-deep text-white hover:bg-neutral-900 font-medium text-sm sm:text-base shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loadingType === "manual" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Send me a code"
                )}
              </Button>
            </div>

            <div className="pt-2 flex items-start gap-2 text-xs text-neutral-500 leading-relaxed">
              <ShieldCheck className="w-4 h-4 shrink-0 text-neutral-400 mt-0.5" />
              <span>{variant.trustNote}</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
