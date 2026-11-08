"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { navigation } from "./workspace/navigation";
import type { WorkspaceView } from "./workspace/types";

export function AnalyticsSidebar({
  view,
  onView,
}: {
  view: WorkspaceView;
  onView: (view: WorkspaceView) => void;
}) {
  const [open, setOpen] = useState(false);
  const content = (
    <>
      <div className="mb-3.5 mt-1 flex h-9 items-center gap-3 px-3">
        <Image src="/logo.svg" alt="RefreeG" width={101} height={31} priority />
        <span className="rounded-md bg-ink px-2 py-1 text-[10px] font-bold tracking-wide text-lime">
          ADMIN
        </span>
      </div>
      <nav aria-label="Admin navigation" className="space-y-1.5">
        {navigation.map((group) => (
          <div key={group.label}>
            {group.label && (
              <p className="mb-1 px-3 pt-1 text-[10px] font-bold uppercase tracking-[0.06em] text-ink/60">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const target: WorkspaceView | undefined =
                item.label === "Analytics"
                  ? "analytics"
                  : item.label === "Users & orgs" || item.label === "Community"
                    ? "users"
                    : item.label === "EIZA coins"
                      ? "eiza"
                      : undefined;
              const active =
                item.label === "Analytics"
                  ? view === "analytics" || view === "ambassadors"
                  : target === view && item.label !== "Community";
              return (
                <button
                  key={item.label}
                  type="button"
                  disabled={!target}
                  title={!target ? "UI preview only" : undefined}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-[34px] w-full items-center gap-3 rounded-lg px-3 text-left text-[13px] transition-colors enabled:hover:bg-ink/[0.04] disabled:cursor-default",
                    active && "bg-ink/[0.055] font-semibold",
                  )}
                  onClick={() => {
                    if (target) onView(target);
                    setOpen(false);
                  }}
                >
                  <item.icon className="h-[15px] w-[15px] shrink-0 stroke-[1.5] text-ink/70" />
                  <span className="flex-1">{item.label}</span>
                  {"count" in item && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ink/[0.07] px-1 text-[10px] font-semibold">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 overflow-y-auto bg-surface px-4 py-3 lg:block">
        {content}
      </aside>
      <div className="flex items-center gap-3 bg-surface px-4 py-3 lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open navigation"
          onClick={() => setOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Image src="/logo.svg" alt="RefreeG" width={101} height={31} />
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="admin-workspace w-[260px] overflow-y-auto bg-surface px-4 py-3 text-ink"
        >
          <SheetTitle className="sr-only">Admin navigation</SheetTitle>
          {content}
        </SheetContent>
      </Sheet>
    </>
  );
}
