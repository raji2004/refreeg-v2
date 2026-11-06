"use client";

import Image from "next/image";

export default function NavigationLoader() {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-cream px-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-6">
        <div className="relative flex h-28 w-28 items-center justify-center sm:h-32 sm:w-32">
          <div className="absolute inset-0 rounded-full border-4 border-hairline" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-forest border-r-forest/40" />
          <div className="absolute inset-[10px] animate-[spin_1.4s_linear_infinite_reverse] rounded-full border-2 border-transparent border-b-forest/50" />

          <div className="relative z-10 h-16 w-16 overflow-hidden rounded-xl border border-hairline bg-surface p-1.5 shadow-subtle sm:h-20 sm:w-20">
            <Image
              src="/logo.svg"
              alt=""
              width={72}
              height={72}
              className="h-full w-full object-contain"
              priority
            />
          </div>
        </div>

        <div className="text-center">
          <p className="font-fraunces text-2xl font-semibold text-ink">
            Loading RefreeG
          </p>
          <p className="mt-2 max-w-xs text-sm leading-6 text-ink/55">
            This usually takes a moment. The page opens as soon as it is ready.
          </p>
        </div>
      </div>
    </div>
  );
}
