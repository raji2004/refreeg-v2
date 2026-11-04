import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

import { COMMUNITY_LINK } from "../_data/faqs";

export function StillStuckCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl bg-lime p-6", className)}>
      <Image
        src="/faq/message.svg"
        alt=""
        aria-hidden="true"
        width={72}
        height={72}
        className="h-14 w-14"
      />

      <h2 className="mt-5 font-fraunces text-2xl font-normal text-ink">
        Still stuck?
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-ink/80">
        Ask us in the Refreeg Telegram community.
      </p>

      <a
        href={COMMUNITY_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-ink-foreground transition-opacity hover:opacity-90"
      >
        Join Telegram
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </a>
    </div>
  );
}
