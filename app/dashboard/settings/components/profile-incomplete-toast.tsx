"use client";

import { useEffect, useRef } from "react";
import { toast } from "@/components/ui/use-toast";

export function ProfileIncompleteToast() {
  const hasShownToast = useRef(false);

  useEffect(() => {
    if (hasShownToast.current) return;
    hasShownToast.current = true;
    toast({
      title: "Profile Incomplete",
      description:
        "You need to complete your profile (full name, bio, and profile picture) to list causes.",
      variant: "destructive",
    });
  }, []);

  return null;
}
