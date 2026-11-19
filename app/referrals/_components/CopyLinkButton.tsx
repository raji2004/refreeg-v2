"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function CopyLinkButton({
  referralLink,
  label = "Copy",
  className,
}: {
  referralLink: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the pending reset on unmount so a closed page can't update state.
  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
      toast({ title: "Link copied" });
    } catch {
      toast({
        title: "Couldn't copy automatically",
        description: "Tap the link field and copy it from there.",
        variant: "destructive",
      });
    }
  };

  const Icon = copied ? Check : Copy;

  return (
    <Button
      variant="outline"
      onClick={handleCopy}
      className={cn("rounded-full border-ink", className)}
    >
      <Icon className="mr-2 h-4 w-4" />
      {copied ? "Copied!" : label}
    </Button>
  );
}
