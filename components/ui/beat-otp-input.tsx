"use client";

import * as React from "react";
import { OTPInput } from "input-otp";
import { AlertCircle, Clipboard } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BeatOtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: string | null;
  disabled?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
  showHelper?: boolean;
  onPasteSuccess?: () => void;
}

export function BeatOtpInput({
  value,
  onChange,
  onComplete,
  error,
  disabled = false,
  autoFocus = true,
  placeholder = "K4T9PQ",
  className,
  id = "otp-input",
  name = "otp",
  showHelper = true,
  onPasteSuccess,
}: BeatOtpInputProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const inputRef = React.useRef<any>(null);

  const cleanPlaceholder = (placeholder.replace(/[^A-Za-z0-9]/g, "") + "••••••")
    .slice(0, 6)
    .toUpperCase();

  const handlePasteClick = async () => {
    if (disabled) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        const cleaned = text
          .replace(/[^A-Za-z0-9]/g, "")
          .slice(0, 6)
          .toUpperCase();
        if (cleaned) {
          onChange(cleaned);
          if (cleaned.length === 6 && onComplete) {
            onComplete(cleaned);
          }
          onPasteSuccess?.();
        }
      }
    } catch {
      inputRef.current?.focus();
    }
  };

  return (
    <div className={cn("w-full space-y-2.5", className)}>
      <div className="relative w-full">
        <OTPInput
          ref={inputRef}
          id={id}
          name={name}
          maxLength={6}
          value={value}
          onChange={(val) => {
            const uppercaseVal = val.toUpperCase();
            onChange(uppercaseVal);
          }}
          onComplete={onComplete}
          disabled={disabled}
          autoFocus={autoFocus}
          pattern="^[a-zA-Z0-9]+$"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          containerClassName="w-full flex justify-center"
          className="disabled:cursor-not-allowed"
          render={({ slots }) => (
            <div
              onClick={() => inputRef.current?.focus()}
              className={cn(
                "relative w-full h-16 sm:h-20 rounded-2xl flex items-center justify-center transition-all duration-200 border-2 select-none cursor-text px-4 sm:px-8",
                error
                  ? "bg-red-50/40 border-red-400 text-red-600 shadow-[0_0_0_4px_rgba(239,68,68,0.08)]"
                  : isFocused
                    ? "bg-white border-blue-600 shadow-[0_0_0_4px_rgba(37,99,235,0.12)] text-neutral-900"
                    : value.length > 0
                      ? "bg-white border-neutral-300 text-neutral-900"
                      : "bg-[#F0EEE9] border-transparent text-neutral-400",
                disabled && "opacity-50 cursor-not-allowed",
              )}
            >
              {}
              <div className="flex items-center gap-2 sm:gap-4">
                {slots.slice(0, 3).map((slot, index) => (
                  <SlotView
                    key={index}
                    slot={slot}
                    placeholderChar={cleanPlaceholder[index]}
                    isFocused={isFocused}
                    hasValue={value.length > 0}
                    hasError={Boolean(error)}
                    disabled={disabled}
                  />
                ))}
              </div>

              {}
              <span
                className={cn(
                  "mx-3 sm:mx-6 text-xl sm:text-3xl font-light select-none transition-colors",
                  error
                    ? "text-red-400"
                    : isFocused
                      ? "text-neutral-400"
                      : value.length > 0
                        ? "text-neutral-300"
                        : "text-neutral-400/60",
                )}
                aria-hidden="true"
              >
                —
              </span>

              {}
              <div className="flex items-center gap-2 sm:gap-4">
                {slots.slice(3, 6).map((slot, index) => (
                  <SlotView
                    key={index + 3}
                    slot={slot}
                    placeholderChar={cleanPlaceholder[index + 3]}
                    isFocused={isFocused}
                    hasValue={value.length > 0}
                    hasError={Boolean(error)}
                    disabled={disabled}
                  />
                ))}
              </div>
            </div>
          )}
        />
      </div>

      {}
      {error && (
        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-red-600 font-medium animate-in fade-in-50 duration-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {}
      {showHelper && (
        <div className="flex items-center justify-between text-xs sm:text-sm text-neutral-500 pt-0.5">
          <span>Six characters. Case doesn&apos;t matter.</span>
          <button
            type="button"
            onClick={handlePasteClick}
            disabled={disabled}
            className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Clipboard className="w-3.5 h-3.5" />
            Paste
          </button>
        </div>
      )}
    </div>
  );
}

function SlotView({
  slot,
  placeholderChar,
  isFocused,
  hasValue,
  hasError,
  disabled,
}: {
  slot: { char: string | null; isActive: boolean; hasFakeCaret: boolean };
  placeholderChar: string;
  isFocused: boolean;
  hasValue: boolean;
  hasError: boolean;
  disabled: boolean;
}) {
  return (
    <div className="relative flex items-center justify-center w-7 sm:w-10 h-10 sm:h-12 text-2xl sm:text-3xl font-bold font-mono uppercase">
      {slot.char ? (
        <span className={cn(hasError ? "text-red-600" : "text-neutral-900")}>
          {slot.char}
        </span>
      ) : (
        <span
          className={cn(
            "transition-opacity select-none",
            hasError
              ? "text-red-300"
              : isFocused || hasValue
                ? "text-neutral-300"
                : "text-neutral-400/80",
          )}
        >
          {placeholderChar}
        </span>
      )}

      {}
      {slot.hasFakeCaret && !disabled && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              "h-6 sm:h-8 w-[2px] animate-caret-blink duration-1000",
              hasError ? "bg-red-600" : "bg-blue-600",
            )}
          />
        </div>
      )}
    </div>
  );
}
