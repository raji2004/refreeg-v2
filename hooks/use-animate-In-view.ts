"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";

type MarginType = NonNullable<Parameters<typeof useInView>[1]>["margin"];

export function useAnimateInView(options?: {
  once?: boolean;
  margin?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const isInView = useInView(ref, {
    once: options?.once ?? true,
    margin: (options?.margin as MarginType) ?? "-100px",
  });

  return { ref, isInView };
}
