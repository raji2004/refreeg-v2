"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { getClaimableCauses, claimCause } from "@/actions/claim-actions";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import { P } from "@/components/typography";

type ClaimableCause = {
  id: string;
  title: string;
  image: string | null;
  goal: number;
  raised: number;
};

export function ClaimBanner() {
  const [causes, setCauses] = useState<ClaimableCause[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    getClaimableCauses().then((data) => setCauses(data as ClaimableCause[]));
  }, []);

  const handleClaim = async (id: string) => {
    setClaiming(id);
    const { error } = await claimCause(id);
    setClaiming(null);
    if (!error) {
      setDismissed((prev) => new Set(prev).add(id));
    }
  };

  const visible = causes.filter((c) => !dismissed.has(c.id));
  if (visible.length === 0) return null;

  return (
    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <P className="text-sm font-medium text-amber-900 mb-3">
        We recovered {visible.length === 1 ? "a campaign" : `${visible.length} campaigns`} that
        may belong to you after a data incident. Is this yours?
      </P>
      <div className="space-y-2">
        {visible.map((cause) => (
          <div
            key={cause.id}
            className="flex items-center gap-3 rounded-xl border border-amber-200 bg-white p-2.5"
          >
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
              {cause.image && (
                <Image
                  src={getMediaUrl(cause.image)}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized={isProxyMediaUrl(getMediaUrl(cause.image))}
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{cause.title}</p>
              <p className="text-xs text-muted-foreground">
                ₦{Number(cause.raised).toLocaleString()} of ₦{Number(cause.goal).toLocaleString()}
              </p>
            </div>
            <Button
              size="sm"
              disabled={claiming === cause.id}
              onClick={() => handleClaim(cause.id)}
            >
              {claiming === cause.id ? "Claiming…" : "This is mine"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
