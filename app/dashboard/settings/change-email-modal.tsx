"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Icons } from "@/components/icons";
import { requestEmailChangeAction } from "@/actions/auth-actions";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

type ChangeEmailModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string;
};

export function ChangeEmailModal({
  open,
  onOpenChange,
  currentEmail,
}: ChangeEmailModalProps) {
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showFailureCopy, setShowFailureCopy] = useState(false);

  const resetLocal = () => {
    setNewEmail("");
    setPassword("");
    setPasswordError(null);
    setShowFailureCopy(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) resetLocal();
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setPasswordError(null);

    try {
      const result = await requestEmailChangeAction(newEmail, password);
      if (!result.success) {
        if (result.code === "bad_password") {
          setPasswordError(result.error);
          setShowFailureCopy(true);
        } else {
          toast({
            title: "Could not start email change",
            description: result.error,
            variant: "destructive",
          });
          if (result.code === "no_password") {
            setShowFailureCopy(true);
          }
        }
        return;
      }

      toast({
        title: "Confirmation sent",
        description: `Check ${newEmail.trim()} and click the link to finish changing your email.`,
      });
      handleClose(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        overlayClassName="bg-ink/40 backdrop-blur-[1px]"
        className={cn(
          "gap-0 overflow-hidden rounded-2xl border border-hairline bg-white p-0 shadow-[0_24px_64px_rgba(15,18,28,0.18)] sm:max-w-[420px]",
        )}
      >
        <form
          onSubmit={handleSubmit}
          className="px-6 pb-6 pt-7 sm:px-7 sm:pb-7 sm:pt-8"
        >
          <DialogHeader className="space-y-0 text-left">
            <DialogTitle className="font-fraunces text-[28px] font-semibold leading-tight text-ink">
              Change your email
            </DialogTitle>
            <DialogDescription className="sr-only">
              Enter a replacement address and confirm with your password. A
              verification link will be sent.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-7 space-y-5">
            <div className="space-y-2">
              <Eyebrow className="text-ink/45">New email</Eyebrow>
              <Input
                type="email"
                autoComplete="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="you@work.ng"
                className="h-11 rounded-lg border-azure/70 bg-white text-ink placeholder:text-ink/35 focus-visible:border-azure focus-visible:ring-azure/25"
                required
              />
            </div>

            <div className="space-y-2">
              <Eyebrow className="text-ink/45">Your password</Eyebrow>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                className="h-11 rounded-lg border-transparent bg-cream-muted text-ink placeholder:text-ink/35 focus-visible:border-azure focus-visible:bg-white focus-visible:ring-azure/25"
                required
              />
              {passwordError ? (
                <p className="text-sm text-destructive">{passwordError}</p>
              ) : null}
            </div>

            {showFailureCopy ? (
              <div className="rounded-xl border border-hairline bg-cream-muted/60 px-4 py-3.5 text-sm leading-6 text-ink/70">
                Your email has not changed and nothing was sent. An email change
                can move the whole account, which is why it asks.
              </div>
            ) : (
              <div className="rounded-xl border border-gold/35 bg-gold/10 px-4 py-3.5 text-sm leading-6 text-ink/80">
                We will email the new address to confirm it. Receipts and alerts
                keep going to{" "}
                <span className="font-medium text-ink">{currentEmail}</span>{" "}
                until you click that link.
              </div>
            )}

            <Button
              type="submit"
              className="mt-1 h-11 w-full rounded-lg bg-azure text-[15px] font-medium text-azure-foreground hover:bg-azure/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : showFailureCopy ? (
                "Try again"
              ) : (
                "Send the confirmation"
              )}
            </Button>

            {showFailureCopy ? (
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="w-full text-center text-sm font-medium text-ink/70 hover:text-ink"
              >
                Cancel the change
              </button>
            ) : null}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
