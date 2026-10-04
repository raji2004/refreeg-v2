"use client";

import Link from "next/link";
import {
  ExternalLink,
  LifeBuoy,
  MessageCircleMore,
  RefreshCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { socialLinks } from "@/lib/links";

type SupportErrorCtaProps = {
  title?: string;
  description?: string;
  errorMessage?: string | null;
  onRetry?: () => void;
  retryLabel?: string;
  compact?: boolean;
};

export function SupportErrorCta({
  title = "Something went wrong",
  description = "For customer support, follow us on X and join our Telegram community. Our team shares updates and responds there.",
  errorMessage,
  onRetry,
  retryLabel = "Try again",
  compact = false,
}: SupportErrorCtaProps) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-[28px] border border-[#E2E8F0] bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.16),_transparent_34%),linear-gradient(135deg,_#FFFFFF_0%,_#F8FAFC_100%)]",
        compact ? "p-5" : "p-6 sm:p-8",
      ].join(" ")}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#0F172A_0%,#2563EB_48%,#22C55E_100%)]" />

      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0F172A] text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
          <LifeBuoy className="h-5 w-5" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-[#0F172A]">{title}</h2>
          <p className="max-w-2xl text-sm leading-6 text-[#475569]">
            {description}
          </p>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link
          href={socialLinks.twitter}
          target="_blank"
          rel="noreferrer"
          className="group rounded-2xl border border-[#CBD5E1] bg-white p-4 transition hover:border-[#0F172A] hover:shadow-[0_16px_34px_rgba(15,23,42,0.08)]"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[#0F172A]">
              Follow us on X
            </p>
            <ExternalLink className="h-4 w-4 text-[#64748B] transition group-hover:text-[#0F172A]" />
          </div>
          <p className="mt-2 text-sm text-[#64748B]">
            Get platform updates and support announcements.
          </p>
        </Link>

        <Link
          href={socialLinks.community}
          target="_blank"
          rel="noreferrer"
          className="group rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-4 transition hover:border-[#2563EB] hover:shadow-[0_16px_34px_rgba(37,99,235,0.12)]"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[#0F172A]">
              Join Telegram
            </p>
            <MessageCircleMore className="h-4 w-4 text-[#2563EB]" />
          </div>
          <p className="mt-2 text-sm text-[#475569]">
            Reach the community and customer support team faster.
          </p>
        </Link>
      </div>

      {onRetry ? (
        <div className="mt-5 flex justify-start">
          <Button
            type="button"
            onClick={onRetry}
            className="rounded-full bg-[#0F172A] px-5 text-white hover:bg-[#1E293B]"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
