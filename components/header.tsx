"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/user-nav";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/logo";
// Import the useAdmin hook
import { useAdmin } from "@/hooks/use-admin";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { LayoutDashboard, ShieldAlert } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReactNode } from "react";
import Dropdown from "@/public/images/dropdown.svg";
import Image from "next/image";

interface MenuLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void; // Explicitly define event type
}

const MenuLink = ({
  href,
  children,
  className,
  onClick,
  ...props
}: MenuLinkProps) => (
  <Link
    href={href}
    className={`relative group inline-flex h-9 w-max items-center justify-center rounded-md px-4 py-2 text-base font-medium transition-colors duration-500 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-gray-100/50 data-[state=open]:bg-gray-100/50 dark:bg-gray-950 dark:hover:bg-gray-800 dark:hover:text-gray-50 dark:focus:bg-gray-800 ease-in-out transform hover:-translate-y-1 hover:scale-110 ${className}`}
    prefetch={false}
    onClick={onClick} // No change here, just ensuring type compatibility
    {...props}
  >
    {children}
  </Link>
);

export function Header() {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [aboutUsOpen, setAboutUsOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-12 flex h-16 items-center justify-between">
        <div className="flex items-center gap-6 md:gap-10">
          <Logo />
          <nav className="hidden gap-6 md:flex">
            <Link
              href="/causes"
              className={`text-sm font-medium transition-colors hover:text-secondary ${
                pathname === "/causes"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Causes
            </Link>
            <Link
              href="/petitions"
              className={`text-sm font-medium transition-colors hover:text-secondary ${
                pathname === "/causes"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Petitions
            </Link>
            <Link
              href="/how-it-works"
              className={`text-sm font-medium transition-colors hover:text-secondary ${
                pathname === "/how-it-works"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              How It Works
            </Link>

            <DropdownMenu open={aboutUsOpen} onOpenChange={setAboutUsOpen}>
              <DropdownMenuTrigger asChild>
                <div
                  className="flex items-center cursor-pointer text-sm font-medium text-muted-foreground transition-colors hover:text-secondary"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevents closing when clicking inside
                    setAboutUsOpen((prev) => !prev);
                  }}
                >
                  About us
                  <Image
                    src={Dropdown}
                    height={12}
                    width={12}
                    alt="dropdown"
                    className="ml-2"
                  />
                </div>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="mt-2 bg-white shadow-lg rounded-md w-max min-w-[12rem] px-1 py-2"
                align="start"
              >
                <DropdownMenuItem asChild>
                  <Link
                    href="/about-us/OurMission"
                    className="whitespace-nowrap hover:underline hover:bg-[#D6EBFF] px-4 py-2 block"
                  >
                    Our Mission
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link
                    href="/about-us/OurStory"
                    className="whitespace-nowrap hover:underline hover:bg-[#D6EBFF] px-4 py-2 block"
                  >
                    Our Story (The "Why" Behind RefreeG)
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link
                    href="/about-us/OurImpact"
                    className="whitespace-nowrap hover:underline hover:bg-[#D6EBFF] px-4 py-2 block"
                  >
                    Our Impact
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link
                    href="/about-us/WhatWeDo"
                    className="whitespace-nowrap hover:underline hover:bg-[#D6EBFF] px-4 py-2 block"
                  >
                    Who are we made by?
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link
                    href="/about-us/WhatWeDo"
                    className="whitespace-nowrap hover:underline hover:bg-[#D6EBFF] px-4 py-2 block"
                  >
                    What We Do
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* {!isLoading && user && (
              <Link
                href="/dashboard"
                className={`text-sm font-medium transition-colors hover:text-secondary flex items-center ${
                  pathname.startsWith("/dashboard") && !pathname.startsWith("/dashboard/admin")
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <LayoutDashboard className="mr-1 h-4 w-4" />
                Dashboard
              </Link>
            )} */}
          </nav>
        </div>
        <div className="flex items-center gap-5">
          {/* <ThemeToggle /> */}
          <Link href="/dashboard/causes/create" className="hidden sm:block">
            <Button variant="outline" size="sm">
              List a Cause
            </Button>
          </Link>
          <Link href="/dashboard/petitions/create" className="hidden sm:block">
            <Button variant="outline" size="sm">
              Create a Petition
            </Button>
          </Link>
          {/* Mobile hamburger menu */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden bg-white hover:bg-gray-100"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </Button>
          {/* Desktop dashboard link visible when logged in */}
          {!isLoading && user && (
            <Link href="/dashboard" className="hidden md:block">
              <Button variant="ghost" size="sm">
                Dashboard
              </Button>
            </Link>
          )}
          {!isLoading && !user ? (
            <div className="flex items-center gap-2">
              <Link href="/auth/signin">
                <Button size="sm" variant="default">
                  Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Mobile: show hamburger user menu */}
              <div className="md:hidden">
                <UserNav />
              </div>
              {/* Desktop: show avatar only (dropdown inside) */}
              <div className="hidden md:block">
                <UserNav />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        isDashboard={pathname.startsWith("/dashboard")}
      />
    </header>
  );
}
