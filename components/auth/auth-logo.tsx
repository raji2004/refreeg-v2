import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AuthLogoProps {
  className?: string;
  variant?: "white" | "dark";
  href?: string;
}

export function AuthLogo({
  className,
  variant = "white",
  href = "/",
}: AuthLogoProps) {
  const content = (
    <div
      className={cn(
        "inline-flex items-center gap-2 font-bold tracking-tight",
        variant === "white" ? "text-white" : "text-neutral-900",
        className,
      )}
    >
      <svg
        width="26"
        height="18"
        viewBox="0 0.2 36.5 23.2"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <path
          transform="translate(0, -23)"
          fillRule="evenodd"
          clipRule="evenodd"
          d="M18.6264 35.7886C25.4797 35.9002 31.8442 32.7554 35.4035 30.8062C35.9099 30.5288 36.1465 29.376 35.9757 28.8245C35.8511 28.422 35.7294 27.8929 35.6284 27.1979C35.4612 26.0462 35.4464 25.0227 35.4831 24.234C35.5111 23.6308 34.7906 23.1777 34.289 23.5141C30.8931 25.7916 25.2814 29.233 18.6264 29.1245C11.2531 29.0044 8.6014 27.2345 2.81865 23.7241C2.38527 23.461 1.8225 23.7546 1.78152 24.2599C1.70528 25.2 1.56876 26.5281 1.35669 27.4063C1.09556 28.4878 0.733407 29.302 0.448872 29.8307C0.243302 30.2127 0.374798 30.726 0.76862 30.908C4.34938 32.562 11.3982 35.6708 18.6264 35.7886Z"
          fill="currentColor"
        />
        <path
          transform="translate(0, -23)"
          fillRule="evenodd"
          clipRule="evenodd"
          d="M18.6264 33.3388C25.4797 33.2271 31.8442 36.3719 35.4035 38.3212C35.9099 38.5985 36.1465 39.7513 35.9757 40.3028C35.8511 40.7053 35.7294 41.2344 35.6284 41.9294C35.4612 43.0812 35.4464 44.1047 35.4831 44.8933C35.5111 45.4966 34.7906 45.9496 34.289 45.6133C30.8931 43.3357 25.2814 39.8944 18.6264 40.0028C11.2531 40.1229 8.6014 41.8929 2.81865 45.4033C2.38527 45.6663 1.82249 45.3727 1.78152 44.8674C1.70528 43.9273 1.56876 42.5993 1.35669 41.721C1.09556 40.6396 0.733406 39.8254 0.448872 39.2966C0.243301 38.9146 0.374798 38.4013 0.76862 38.2194C4.34938 36.5653 11.3982 33.4565 18.6264 33.3388Z"
          fill="currentColor"
        />
      </svg>
      <span className="text-xl font-bold tracking-tight">Refreeg</span>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-block transition-opacity hover:opacity-80"
      >
        {content}
      </Link>
    );
  }

  return content;
}
