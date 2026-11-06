import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import { cn } from "@/lib/utils";
import type { GiftRow as Gift } from "@/actions/giving-actions";
import { formatDay, formatNaira } from "./format";

const STATUS = {
  delivered: { label: "Delivered", variant: "forest" },
  "in-progress": { label: "In progress", variant: "cyan" },
  pledge: { label: "Pledged", variant: "pending" },
} as const;

export function GiftRow({ gift }: { gift: Gift }) {
  const status = STATUS[gift.status];
  const imageUrl = getMediaUrl(gift.image) || "/placeholder.svg";
  const isPledge = gift.kind === "pledge";

  return (
    <li
      className={cn(
        "flex items-center gap-4 rounded-2xl border border-ink/10 shadow-subtle bg-surface p-3.5 sm:p-4",
        isPledge ? "border border-ink/25" : "border border-transparent",
      )}
    >
      <Link
        href={gift.href}
        className="relative h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-bone sm:h-16 sm:w-[84px]"
      >
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="84px"
          className="object-cover"
          unoptimized={isProxyMediaUrl(imageUrl)}
        />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <Link
            href={gift.href}
            className="truncate font-semibold text-ink hover:underline"
          >
            {gift.title}
          </Link>
          <Badge
            variant={status.variant}
            className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          >
            {status.label}
          </Badge>
        </div>
        <p className="mt-1 truncate text-sm text-ink/60">
          {isPledge
            ? `${formatNaira(gift.amount)} will be charged on ${formatDay(gift.date)}.`
            : `${gift.owner} · ${formatDay(gift.date)}`}
        </p>
      </div>

      <p className="shrink-0 font-semibold tabular-nums text-ink">
        {formatNaira(gift.amount)}
      </p>
      {gift.reference && (
        <Link
          href={`/receipt/${encodeURIComponent(gift.reference)}`}
          className="hidden shrink-0 rounded-xl border border-hairline bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-bone sm:block"
        >
          Receipt
        </Link>
      )}
    </li>
  );
}
