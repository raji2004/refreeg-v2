"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";

export function useAnimateInView(options?: {
  once?: boolean;
  margin?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const isInView = useInView(ref, {
    once: options?.once ?? true,
    margin: (options?.margin as any) ?? "-100px",
  });

  return { ref, isInView };
}
