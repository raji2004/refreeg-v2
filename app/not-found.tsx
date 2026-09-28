"use client";

import { useRouter } from "nextjs-toploader/app";
import { SupportErrorCta } from "@/components/support-error-cta";

export default function NotFoundPage() {
  const router = useRouter();

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-4 py-12 sm:px-6">
      <SupportErrorCta
        title="This page could not be found"
        description="Please follow us on X and join our Telegram community for customer support if you need help finding the right page."
        onRetry={() => router.push("/")}
        retryLabel="Go home"
      />
    </main>
  );
}
