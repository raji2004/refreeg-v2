"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const socialButtonClass =
  "w-full h-12 flex items-center justify-center rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 shadow-sm text-sm font-medium text-neutral-800 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer";

export function SocialSignInButtons({
  disabled,
  googleLoading,
  onGoogle,
  onApple,
}: {
  disabled: boolean;
  googleLoading: boolean;
  onGoogle: () => void;
  onApple: () => void;
}) {
  return (
    <div className="space-y-3 mb-6">
      <Button
        type="button"
        variant="bare"
        size="bare"
        onClick={onGoogle}
        disabled={disabled}
        className={`${socialButtonClass} gap-3`}
      >
        {googleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-neutral-700" />
        ) : (
          <>
            <Image
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              width={18}
              height={18}
              alt="Google"
              className="shrink-0"
            />
            <span>Continue with Google</span>
          </>
        )}
      </Button>

      <Button
        type="button"
        variant="bare"
        size="bare"
        onClick={onApple}
        disabled={disabled}
        className={`${socialButtonClass} gap-2.5`}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 170 170"
          fill="currentColor"
          className="shrink-0"
        >
          <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.08-7.7-7.94-12.04-14.58-6.19-9.52-11.04-20.17-14.55-31.96-3.51-11.78-5.27-23.04-5.27-33.77 0-14.33 3.66-26.11 10.98-35.34 7.32-9.23 16.5-13.9 27.54-14.02 5.06 0 10.43 1.25 16.12 3.75 5.68 2.5 9.77 3.81 12.26 3.93 1.93-.12 6.13-1.49 12.61-4.11 6.48-2.62 11.96-3.84 16.44-3.65 12.44.63 22.39 5.25 29.85 13.86-10.87 6.64-16.18 15.65-15.93 27.03.26 8.94 3.74 16.5 10.45 22.68 6.7 6.18 14.68 9.77 23.94 10.77-1.93 5.92-4.15 11.66-6.66 17.23zM119.22 33.56c0-6.73 2.45-13.11 7.35-19.14 4.9-6.03 11.02-9.98 18.36-11.86.87 3.37 1.08 6.47.63 9.31-.7 4.49-2.73 9.07-6.09 13.74-3.36 4.67-7.46 7.97-12.3 9.9-1.99.8-3.79 1.15-5.4 1.05-.33-1-.62-2.02-.85-3.05-.62-2.82-.93-5.29-.93-7.42z" />
        </svg>
        <span>Continue with Apple</span>
      </Button>
    </div>
  );
}
