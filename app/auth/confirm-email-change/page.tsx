import Link from "next/link";
import { confirmEmailChangeAction } from "@/actions/auth-actions";
import { Button } from "@/components/ui/button";

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ConfirmEmailChangePage({
  searchParams,
}: PageProps) {
  const { token } = await searchParams;
  const result = token
    ? await confirmEmailChangeAction(token)
    : { success: false as const, error: "Missing confirmation token." };

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-hairline bg-white p-8 text-center shadow-sm">
        {result.success ? (
          <>
            <h1 className="font-fraunces text-3xl font-semibold text-ink">
              Email updated
            </h1>
            <p className="mt-3 text-sm leading-6 text-ink/65">
              Your account email is now{" "}
              <span className="font-medium text-ink">{result.email}</span>.
              Sign in again with the new address if your session looks stale.
            </p>
            <Button asChild variant="lime" className="mt-8 h-11 rounded-full px-6">
              <Link href="/dashboard/settings/profile">Back to profile</Link>
            </Button>
          </>
        ) : (
          <>
            <h1 className="font-fraunces text-3xl font-semibold text-ink">
              Link expired
            </h1>
            <p className="mt-3 text-sm leading-6 text-ink/65">
              {result.error ||
                "This confirmation link is invalid or has expired."}
            </p>
            <Button asChild variant="outline" className="mt-8 h-11 rounded-full px-6">
              <Link href="/dashboard/settings/profile">Back to profile</Link>
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
