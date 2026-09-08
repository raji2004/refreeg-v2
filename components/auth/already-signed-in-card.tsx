"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut as nextAuthSignOut } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shown on /auth/signin and /auth/signup instead of the form when a valid
 * session already exists — middleware.ts no longer silently redirects those
 * two pages away to /dashboard (see that file), since that made it
 * impossible to ever reach the form to sign in as someone else. This gives
 * an explicit choice instead, the same pattern Google's own "choose an
 * account" screen uses.
 */
export function AlreadySignedInCard({
  name,
  email,
  redirectTo,
  variant,
}: {
  name?: string | null;
  email?: string | null;
  redirectTo: string;
  variant: "signin" | "signup";
}) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  const handleSwitchAccount = async () => {
    setSwitching(true);
    try {
      // redirect:false — no navigation here. Clearing the session makes
      // useSession() (read by the parent page) flip to unauthenticated,
      // which swaps this card out for the real form in place.
      await nextAuthSignOut({ redirect: false });
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
      <p className="text-sm text-neutral-600">Signed in as</p>
      <p className="mt-1 truncate text-lg font-semibold text-neutral-900">
        {name || email || "your account"}
      </p>
      {name && email ? (
        <p className="truncate text-sm text-neutral-500">{email}</p>
      ) : null}

      <div className="mt-6 flex flex-col gap-3">
        <Button onClick={() => router.push(redirectTo)} className="w-full">
          {variant === "signup" ? "Go to dashboard" : "Continue"}
        </Button>
        <button
          type="button"
          onClick={handleSwitchAccount}
          disabled={switching}
          className="text-sm font-medium text-neutral-600 hover:underline disabled:opacity-50"
        >
          {switching ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              Signing out...
            </span>
          ) : variant === "signup" ? (
            "Sign up with a different email"
          ) : (
            "Sign in as someone else"
          )}
        </button>
      </div>
    </div>
  );
}
