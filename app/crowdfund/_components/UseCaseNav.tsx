"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { useCases } from "../_data/use-cases";

export function UseCaseNav() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    useCases.forEach(({ id }) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const list = listRef.current;
    const chip = list?.querySelector<HTMLElement>(`a[href="#${activeId}"]`);
    if (!list || !chip) return;
    list.scrollTo({
      left: chip.offsetLeft - (list.clientWidth - chip.offsetWidth) / 2,
      behavior: "smooth",
    });
  }, [activeId]);

  return (
    <nav
      aria-label="Use cases"
      className="sticky top-[88px] z-40 border-b border-hairline bg-surface/85 backdrop-blur-md"
    >
      <ul
        ref={listRef}
        className="relative mx-auto flex max-w-6xl gap-6 overflow-x-auto px-4 sm:justify-center sm:gap-10 sm:px-6 [&::-webkit-scrollbar]:hidden"
      >
        {useCases.map(({ id, label }, index) => (
          <li key={id} className="shrink-0">
            <a
              href={`#${id}`}
              aria-current={activeId === id ? "location" : undefined}
              className={cn(
                "flex items-baseline gap-2 border-b-2 py-4 text-sm transition-colors",
                activeId === id
                  ? "border-blue-accent text-ink"
                  : "border-transparent text-ink/50 hover:text-ink",
              )}
            >
              <span className="font-fraunces text-xs italic">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="font-medium">{label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
