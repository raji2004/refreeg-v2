"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SupportErrorCta } from "@/components/support-error-cta";
import { reportClientError } from "@/lib/client-error-reporter";


export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    reportClientError(error, { type: "react" });
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-4 py-12 sm:px-6">
      <SupportErrorCta
        title="We hit an error loading this page"
        description="Please follow us on X and join our Telegram community for customer support while we sort this out."
        errorMessage={error.message}
        onRetry={() => router.push("/")}
        retryLabel="Go home"
      />
    </main>
  );
}
