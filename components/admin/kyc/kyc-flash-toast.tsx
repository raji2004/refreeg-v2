"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { updateVerificationStatus } from "@/actions/users/kyc-actions";

const flashTitles: Record<string, (name: string) => string> = {
  approved: (name) => `${name} verified · they can now receive payouts`,
  rejected: (name) => `${name}'s verification was rejected`,
  resubmitted: (name) => `Resubmission request sent to ${name}`,
};

/**
 * Decision toast from the designer's flow, with Undo for approve/reject.
 * Reads ?flash=... once, then strips the params from the URL.
 */
export function KycFlashToast() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const handledKey = useRef<string | null>(null);

  useEffect(() => {
    const flash = searchParams.get("flash");
    if (!flash || !(flash in flashTitles)) return;

    const key = searchParams.toString();
    if (handledKey.current === key) return;
    handledKey.current = key;

    const name = searchParams.get("name") || "The applicant";
    const kycId = searchParams.get("kycId");

    toast({
      title: flashTitles[flash](name),
      ...(kycId && flash !== "resubmitted"
        ? {
            action: (
              <ToastAction
                altText="Undo the last decision"
                onClick={async () => {
                  const result = await updateVerificationStatus(
                    kycId,
                    "pending",
                  );
                  if (result.error) {
                    toast({ title: result.error, variant: "destructive" });
                    return;
                  }
                  toast({
                    title: "Decision undone · the case is back in review",
                  });
                  router.refresh();
                }}
              >
                Undo
              </ToastAction>
            ),
          }
        : {}),
    });

    router.replace(pathname, { scroll: false });
  }, [searchParams, pathname, router, toast]);

  return null;
}
