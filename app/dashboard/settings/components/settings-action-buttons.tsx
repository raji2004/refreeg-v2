"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";

type SettingsSaveButtonProps = Omit<
  ComponentProps<typeof Button>,
  "variant" | "size" | "children"
> & {
  saving?: boolean;
  label?: string;
  savingLabel?: string;
};

export function SettingsSaveButton({
  saving = false,
  label = "Save",
  savingLabel = "Saving",
  className,
  disabled,
  ...props
}: SettingsSaveButtonProps) {
  return (
    <Button
      type="button"
      size="sm"
      className={cn(
        "h-9 rounded-lg bg-azure px-4 text-sm font-medium text-azure-foreground hover:bg-azure/90",
        className,
      )}
      disabled={disabled || saving}
      {...props}
    >
      {saving ? (
        <>
          <Icons.spinner className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          {savingLabel}
        </>
      ) : (
        label
      )}
    </Button>
  );
}

type SettingsCancelButtonProps = Omit<
  ComponentProps<typeof Button>,
  "variant" | "size" | "children"
> & {
  label?: string;
};

export function SettingsCancelButton({
  label = "Cancel",
  className,
  ...props
}: SettingsCancelButtonProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={cn(
        "h-9 rounded-lg border-azure bg-white px-4 text-sm font-medium text-azure hover:bg-azure/5 hover:text-black/40",
        className,
      )}
      {...props}
    >
      {label}
    </Button>
  );
}
