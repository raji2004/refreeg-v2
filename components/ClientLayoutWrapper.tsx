"use client";

import type React from "react";
import { usePathname } from "next/navigation";

/**
 * Dashboard content chrome (max-width, padding, the rounded card look).
 * The sidebar this used to render itself (DashboardNav) is now supplied
 * globally by components/app-shell/app-shell.tsx, so this only owns the
 * content-area styling — not navigation.
 */
export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideNav = pathname.startsWith("/dashboard/settings/kyc-setup");

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
          <main className="flex min-w-0 flex-col overflow-hidden">
            <div className="rounded-[24px] border border-white/80 bg-white/66 p-2 shadow-[0_30px_70px_-50px_rgba(15,23,42,0.55)] backdrop-blur sm:rounded-[30px] sm:p-4">
              <div className="rounded-[20px] border border-slate-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] px-0.5 py-1.5 sm:rounded-[24px] sm:px-2 sm:py-3">
                {children}
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
