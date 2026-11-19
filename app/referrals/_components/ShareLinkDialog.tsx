"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { Mail, MessageCircle, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { CopyLinkButton } from "./CopyLinkButton";

const SHARE_TEXT = "Join me on RefreeG!";

export function ShareLinkDialog({
  open,
  onOpenChange,
  referralLink,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referralLink: string;
}) {
  const [canShare, setCanShare] = useState(false);

  // navigator.share exists only on supported devices; check after mount so
  // server and client render the same markup on first paint.
  useEffect(() => {
    setCanShare(typeof navigator.share === "function");
  }, []);

  const message = encodeURIComponent(`${SHARE_TEXT} ${referralLink}`);

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: SHARE_TEXT,
        text: SHARE_TEXT,
        url: referralLink,
      });
    } catch {
      // user dismissed the share sheet: nothing to do
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-fraunces text-2xl font-normal">
            Share your <em>link.</em>
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-2xl bg-warm-neutral p-5">
            <QRCode
              value={referralLink}
              size={140}
              bgColor="transparent"
              fgColor="hsl(var(--ink))"
            />
          </div>
          <p className="w-full truncate rounded-full bg-cream-muted px-4 py-2 text-center font-mono text-xs text-ink/60">
            {referralLink}
          </p>
        </div>
        <div className="mt-1 space-y-2">
          <Button
            asChild
            className="w-full rounded-full bg-blue-accent text-white hover:bg-blue-accent/90"
          >
            <a
              href={`https://wa.me/?text=${message}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Share on WhatsApp
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full rounded-full border-ink"
          >
            <a
              href={`mailto:?subject=${encodeURIComponent(SHARE_TEXT)}&body=${message}`}
            >
              <Mail className="mr-2 h-4 w-4" />
              Share by email
            </a>
          </Button>
          {canShare && (
            <Button
              variant="outline"
              onClick={handleNativeShare}
              className="w-full rounded-full border-ink"
            >
              <Share2 className="mr-2 h-4 w-4" />
              More options
            </Button>
          )}
          <CopyLinkButton
            referralLink={referralLink}
            className="w-full"
            label="Copy link"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
