"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface DonateButtonProps {
  type?: "cause" | "petition";
  id?: string;
  href?: string;
  fullWidth?: boolean;
  onClick?: () => void;
  disableLink?: boolean;
}

export function DonateButton({
  type,
  id,
  href,
  fullWidth = true,
  onClick,
  disableLink = false,
}: DonateButtonProps) {
  const pathname = usePathname();

  const detectedType: "cause" | "petition" | null =
    type ||
    (pathname.includes("/causes")
      ? "cause"
      : pathname.includes("/petitions")
        ? "petition"
        : null);

  if (!detectedType && !href) {
    console.warn(
      "DonateButton: Could not detect type from pathname. Provide 'type' or 'href'.",
    );
    return null;
  }

  const detectedId = id || pathname.split("/").filter(Boolean).pop();

  const finalHref =
    href ||
    (detectedId
      ? `/${detectedType}s/${detectedId}/donate`
      : `/${detectedType}s/donate`);

  const button = (
    <Button
      className={`${
        fullWidth ? "" : ""
      } bg-white hover:text-white border border-blue-900 text-blue-900`}
      variant="default"
      size="default"
      onClick={onClick}
    >
      {detectedType === "cause" ? "Donate" : "Sign Now"}
    </Button>
  );

  // ✅ Prevent nested <a>
  if (disableLink) return button;

  return href || finalHref ? <Link href={finalHref}>{button}</Link> : button;
}
