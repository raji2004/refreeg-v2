"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { AdminShellNav } from "./AdminShellNav";
import { AdminShellHeader } from "./AdminShellHeader";

function AdminBrand() {
  return (
    <Link
      href="/dashboard/admin/analytics"
      className="mb-6 flex items-center gap-2 px-3"
    >
      <Logo />
      <Badge variant="live" className="rounded-sm px-1.5 text-[10px]">
        ADMIN
      </Badge>
    </Link>
  );
}

/** Chrome for every /dashboard/admin route: review sidebar with queue counts and the admin top bar. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-cream">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-hairline bg-bone px-3 py-5 lg:flex">
        <AdminBrand />
        <AdminShellNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminShellHeader onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-1">{children}</main>
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 bg-bone p-4">
          <SheetTitle className="sr-only">Admin navigation</SheetTitle>
          <AdminBrand />
          <AdminShellNav onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
