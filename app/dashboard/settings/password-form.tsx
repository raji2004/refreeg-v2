"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KeyRound } from "lucide-react";
import {
  getHasPasswordAction,
  updatePasswordAction,
} from "@/actions/auth-actions";
import { toast } from "@/components/ui/use-toast";
import { useValidator } from "@/hooks/use-validator";
import { changePasswordSchema } from "@/lib/schemas/registration.schema";

const emptyForm = { currentPassword: "", newPassword: "", confirmPassword: "" };

export function PasswordForm() {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const { errors, validate, clearError } = useValidator({
    store: form,
    schema: changePasswordSchema,
  });

  const setFormFields = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    clearError(key);
  };

  useEffect(() => {
    getHasPasswordAction().then(setHasPassword);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast({
        title: "Passwords don't match",
        description: "Re-enter your new password to confirm it.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const result = await updatePasswordAction(
        hasPassword ? form.currentPassword : null,
        form.newPassword,
      );

      if (!result.success) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: hasPassword ? "Password updated" : "Password set",
        description: hasPassword
          ? "Your password has been changed."
          : "You can now sign in with your email and this password too.",
      });
      setHasPassword(true);
      setForm(emptyForm);
    } finally {
      setIsSaving(false);
    }
  };

  if (hasPassword === null) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Password
        </CardTitle>
        <CardDescription>
          {hasPassword
            ? "Change the password used to sign in with your email."
            : "Your account was created with Google. Set a password to also sign in with your email."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {hasPassword && (
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={form.currentPassword}
                onChange={(e) =>
                  setFormFields("currentPassword", e.target.value)
                }
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="newPassword">
              {hasPassword ? "New password" : "Password"}
            </Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={form.newPassword}
              onChange={(e) => setFormFields("newPassword", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={form.confirmPassword}
              onChange={(e) => setFormFields("confirmPassword", e.target.value)}
              aria-invalid={!!errors.confirmPassword}
              required
            />
            {errors.confirmPassword && (
              <p role="alert" className="text-sm text-destructive">
                {errors.confirmPassword}
              </p>
            )}
          </div>
          <Button type="submit" disabled={isSaving}>
            {isSaving
              ? "Saving..."
              : hasPassword
                ? "Update password"
                : "Set password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
