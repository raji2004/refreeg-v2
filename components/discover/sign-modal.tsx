"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { signPetitionQuick } from "@/actions/sign-petition-actions";

export function SignModal({
  petitionId,
  petitionTitle,
  defaultName = "",
  defaultEmail = "",
  open,
  onOpenChange,
}: {
  petitionId: string;
  petitionTitle: string;
  defaultName?: string;
  defaultEmail?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error: submitError } = await signPetitionQuick({
      petitionId,
      name,
      email,
      message,
      isAnonymous,
    });

    setSubmitting(false);
    if (submitError) {
      setError(submitError);
      return;
    }
    setSigned(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle>Sign this petition</DialogTitle>
        <p className="text-sm text-muted-foreground -mt-2">{petitionTitle}</p>

        {signed ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Thanks for signing — your voice has been added.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="sign-name">Your Name</Label>
              <Input
                id="sign-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isAnonymous}
                required={!isAnonymous}
                placeholder="Your name"
              />
            </div>
            <div>
              <Label htmlFor="sign-email">Email</Label>
              <Input
                id="sign-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>
            <div>
              <Label htmlFor="sign-message">Message (optional)</Label>
              <Textarea
                id="sign-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                placeholder="Why does this matter to you?"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="sign-anon"
                checked={isAnonymous}
                onCheckedChange={setIsAnonymous}
              />
              <Label htmlFor="sign-anon">Sign anonymously</Label>
            </div>
            {error && (
              <p className="text-sm font-medium text-rose-600">{error}</p>
            )}
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Signing…" : "Sign this petition"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
