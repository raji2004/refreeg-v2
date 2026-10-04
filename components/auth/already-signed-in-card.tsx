"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut as nextAuthSignOut } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
