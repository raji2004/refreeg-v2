"use client";

import { useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AuthFieldProps = Omit<React.ComponentProps<typeof Input>, "id"> & {
  id: string;
  label: string;
  error?: string;
  /** Shown opposite the label, e.g. a "Forgot password?" link. */
  labelAction?: ReactNode;
};

/**
 * Labelled sign-up input with an inline error. Password fields get their own
 * show/hide toggle.
 */
export function AuthField({
  id,
  label,
  error,
  labelAction,
  type,
  className,
  ...inputProps
}: AuthFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";

  const input = (
    <Input
      id={id}
      type={isPassword && revealed ? "text" : type}
      aria-invalid={!!error}
      className={cn(
        "h-12 rounded-xl bg-linen/70 border border-neutral-200/80 px-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-blue-600 transition-colors",
        isPassword && "pr-11",
        error && "border-red-500 bg-red-50/20",
        className,
      )}
      {...inputProps}
    />
  );

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600"
        >
          {label}
        </label>
        {labelAction}
      </div>
      {isPassword ? (
        <div className="relative">
          {input}
          <Button
            type="button"
            variant="bare"
            size="bare"
            onClick={() => setRevealed((current) => !current)}
            className="absolute right-0 top-0 bottom-0 px-3.5 flex items-center text-neutral-400 hover:text-neutral-600 cursor-pointer"
            tabIndex={-1}
          >
            {revealed ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </Button>
        </div>
      ) : (
        input
      )}
      {error && (
        <p role="alert" className="text-xs text-red-600 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
