"use client";

import { useEffect, type RefObject } from "react";

type GsapInstance = (typeof import("gsap"))["gsap"];
type ScrollTriggerPlugin =
  (typeof import("gsap/ScrollTrigger"))["ScrollTrigger"];

let pageHeightObserver: ResizeObserver | undefined;

// ScrollTrigger only re-measures on window resize, so content that loads or
// streams in after mount leaves trigger positions stale (and from() targets hidden).
function watchPageHeight(ScrollTrigger: ScrollTriggerPlugin) {
  if (pageHeightObserver || typeof ResizeObserver === "undefined") return;
  let lastHeight = document.body.scrollHeight;
  let timer: ReturnType<typeof setTimeout> | undefined;
  pageHeightObserver = new ResizeObserver(() => {
    const height = document.body.scrollHeight;
    if (height === lastHeight) return;
    lastHeight = height;
    clearTimeout(timer);
    timer = setTimeout(() => ScrollTrigger.refresh(), 150);
  });
  pageHeightObserver.observe(document.body);
}

/**
 * Runs GSAP animations with gsap + ScrollTrigger lazily imported inside the
 * effect, so the animation library (~40KB gzipped) is a separate async chunk
 * instead of part of the initial JS bundle.
 *
 * `build` runs inside `gsap.context(..., scope)`: same scoping/cleanup
 * semantics as the inline `useEffect` it replaces:
 *
 *   useGsap((gsap) => { gsap.from(".hero-title", {...}); }, heroRef);
 *
 * The cleanup reverts the context on unmount and before re-runs.
 */
export function useGsap(
  build: (gsap: GsapInstance, ScrollTrigger: ScrollTriggerPlugin) => void,
  scope: RefObject<HTMLElement | null>,
  deps: unknown[] = [],
) {
  useEffect(() => {
    let ctx: { revert: () => void } | undefined;
    let cancelled = false;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      watchPageHeight(ScrollTrigger);
      ctx = gsap.context(() => build(gsap, ScrollTrigger), scope);
    })();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
