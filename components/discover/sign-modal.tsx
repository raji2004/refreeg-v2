"use client";

import { useState } from "react";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { ResponsiveDialogContent } from "@/components/ui/responsive-dialog-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FieldError } from "@/components/ui/field-error";
import { signPetitionQuick } from "@/actions/petitions/sign-petition-actions";
import { useValidator } from "@/hooks/use-validator";
import {
  petitionSignSchema,
  type PetitionSignFields,
} from "@/lib/schemas/petition-sign.schema";

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
  const [form, setForm] = useState<PetitionSignFields>({
    name: defaultName,
    email: defaultEmail,
    message: "",
    isAnonymous: false,
  });
  const [status, setStatus] = useState({
    submitting: false,
    error: null as string | null,
    signed: false,
  });
  const { errors, validate, clearError } = useValidator({
    store: form,
    schema: petitionSignSchema,
  });

  const setFormFields = <K extends keyof PetitionSignFields>(
    key: K,
    value: PetitionSignFields[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    clearError(key);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setStatus((current) => ({ ...current, submitting: true, error: null }));

    const { error } = await signPetitionQuick({ petitionId, ...form });

    setStatus({ submitting: false, error, signed: !error });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md max-h-[85vh] sm:max-h-none overflow-y-auto">
        <DialogTitle>Sign this petition</DialogTitle>
        <p className="text-sm text-muted-foreground -mt-2">{petitionTitle}</p>

        {status.signed ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Thanks for signing! Your voice has been added.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="sign-name">Your Name</Label>
              <Input
                id="sign-name"
                value={form.name}
                onChange={(e) => setFormFields("name", e.target.value)}
                disabled={form.isAnonymous}
                placeholder="Your name"
              />
              <FieldError message={errors.name} />
            </div>
            <div>
              <Label htmlFor="sign-email">Email</Label>
              <Input
                id="sign-email"
                type="email"
                value={form.email}
                onChange={(e) => setFormFields("email", e.target.value)}
                placeholder="you@example.com"
              />
              <FieldError message={errors.email} />
            </div>
            <div>
              <Label htmlFor="sign-message">Message (optional)</Label>
              <Textarea
                id="sign-message"
                value={form.message}
                onChange={(e) => setFormFields("message", e.target.value)}
                rows={2}
                placeholder="Why does this matter to you?"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="sign-anon"
                checked={form.isAnonymous}
                onCheckedChange={(checked) =>
                  setFormFields("isAnonymous", checked)
                }
              />
              <Label htmlFor="sign-anon">Sign anonymously</Label>
            </div>
            {status.error && (
              <p className="text-sm font-medium text-rose-600">
                {status.error}
              </p>
            )}
            <Button
              type="submit"
              disabled={status.submitting}
              className="w-full"
            >
              {status.submitting ? "Signing…" : "Sign this petition"}
            </Button>
          </form>
        )}
      </ResponsiveDialogContent>
    </Dialog>
  );
}
