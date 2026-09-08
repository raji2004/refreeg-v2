import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldCheck, LogIn } from "lucide-react";

export function SidebarCtaCard({
  isAuthenticated,
  isVerified,
}: {
  isAuthenticated: boolean;
  isVerified: boolean;
}) {
  if (isAuthenticated && isVerified) return null;

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-ink/15 bg-white p-4">
        <div className="flex items-center gap-2 text-ink">
          <LogIn className="h-4 w-4" />
          <p className="text-sm font-semibold">Raising for something?</p>
        </div>
        <p className="mt-1.5 text-xs text-ink/60">
          Sign in to start a campaign and track your giving.
        </p>
        <Link href="/auth/signin" className="mt-3 block">
          <Button variant="lime" size="sm" className="w-full">
            Sign in
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ink/15 bg-white p-4">
      <div className="flex items-center gap-2 text-ink">
        <ShieldCheck className="h-4 w-4" />
        <p className="text-sm font-semibold">Raising for something?</p>
      </div>
      <p className="mt-1.5 text-xs text-ink/60">
        Verify your identity to start a campaign.
      </p>
      <Link href="/dashboard/settings/kyc-setup" className="mt-3 block">
        <Button variant="lime" size="sm" className="w-full">
          Verify identity
        </Button>
      </Link>
    </div>
  );
}
