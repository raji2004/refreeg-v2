"use client";

import type { ComponentProps } from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

type SettingsSwitchProps = ComponentProps<typeof SwitchPrimitives.Root> & {
  locked?: boolean;
};

export function SettingsSwitch({
  className,
  locked = false,
  disabled,
  ...props
}: SettingsSwitchProps) {
  return (
    <SwitchPrimitives.Root
      disabled={disabled || locked}
      className={cn(
        "peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25 focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
        "disabled:cursor-not-allowed",
        locked
          ? "data-[state=checked]:bg-forest/35 data-[state=unchecked]:bg-white disabled:opacity-100"
          : "data-[state=checked]:bg-forest data-[state=unchecked]:bg-white data-[state=unchecked]:shadow-[inset_0_0_0_1px_hsl(var(--hairline))]",
        className,
      )}
      {...props}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform",
          "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5",
        )}
      />
    </SwitchPrimitives.Root>
  );
}
