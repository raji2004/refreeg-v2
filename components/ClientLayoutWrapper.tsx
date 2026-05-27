"use client";

import type React from "react";
import { usePathname } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideNav = pathname.startsWith("/dashboard/settings/kyc-setup") || pathname.startsWith("/dashboard/admin/api-docs");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.10),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.08),transparent_22%),linear-gradient(180deg,#f8fbff_0%,#eef4fb_48%,#f8fafc_100%)]">
      {hideNav ? (
        <div className="flex-1 flex flex-col w-full">
          <main className="flex w-full flex-col overflow-hidden py-6">
            {children}
          </main>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-3 pb-6 pt-3 sm:px-6 sm:pb-8 sm:pt-4 lg:px-8">
          <div className="mb-3 flex items-center justify-between rounded-[20px] border border-white/70 bg-white/80 px-3 py-3 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.5)] backdrop-blur sm:px-4 md:mb-4 md:hidden">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Dashboard
              </p>
              <p className="text-sm font-semibold text-slate-950">
                Navigation and workspace
              </p>
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-2xl border-slate-200 bg-white"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open dashboard navigation</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[88vw] max-w-sm overflow-y-auto border-r border-slate-200 bg-[#f8fbff] p-4"
              >
                <SheetTitle className="sr-only">
                  Dashboard navigation
                </SheetTitle>
                <DashboardNav />
              </SheetContent>
            </Sheet>
          </div>

          <div className="items-start md:grid md:grid-cols-[320px_minmax(0,1fr)] md:gap-6 xl:grid-cols-[340px_minmax(0,1fr)] xl:gap-8">
            <aside className="sticky top-20 z-20 hidden max-h-[calc(100vh-6rem)] overflow-y-auto pr-2 md:block">
              <DashboardNav />
            </aside>

            <main className="flex min-w-0 flex-col overflow-hidden">
              <div className="rounded-[24px] border border-white/80 bg-white/66 p-2 shadow-[0_30px_70px_-50px_rgba(15,23,42,0.55)] backdrop-blur sm:rounded-[30px] sm:p-4">
                <div className="rounded-[20px] border border-slate-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] px-0.5 py-1.5 sm:rounded-[24px] sm:px-2 sm:py-3">
                  {children}
                </div>
              </div>
            </main>
          </div>
        </div>
      )}
    </div>
  );
}
