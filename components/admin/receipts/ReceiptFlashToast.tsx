"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { useToast } from "@/hooks/use-toast";
import { useRefreshAdminShell } from "@/hooks/use-admin-shell";
import { formatNairaShort } from "@/lib/causes/discover-summary";

const flashTitles: Record<string, (params: URLSearchParams) => string> = {
  verified: (params) => {
    const amount = params.get("amount");
    return amount
      ? `${params.get("receipt")} verified · ${formatNairaShort(Number(amount))} ready for release`
      : `${params.get("receipt")} verified`;
  },
  info: (params) =>
    `${params.get("receipt")} sent back · waiting on ${params.get("name") || "the creator"}`,
  rejected: (params) =>
    `${params.get("receipt")} rejected · ${params.get("name") || "the creator"} was emailed`,
};

/** Decision toast on the queue: reads ?flash=... once, refreshes the sidebar counts, then strips the params. */
export function ReceiptFlashToast() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const refreshAdminShell = useRefreshAdminShell();
  const handledKey = useRef<string | null>(null);

  useEffect(() => {
    const flash = searchParams.get("flash");
    if (!flash || !(flash in flashTitles)) return;

    const key = searchParams.toString();
    if (handledKey.current === key) return;
    handledKey.current = key;

    toast({ title: flashTitles[flash](searchParams) });
    refreshAdminShell();

    const tab = searchParams.get("tab");
    router.replace(tab ? `${pathname}?tab=${tab}` : pathname, {
      scroll: false,
    });
  }, [searchParams, pathname, router, toast, refreshAdminShell]);

  return null;
}
