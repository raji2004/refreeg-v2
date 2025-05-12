"use client"

import { useState } from "react";
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserNav } from "@/components/user-nav"
import { useAuth } from "@/hooks/use-auth"
import { Logo } from "@/components/logo"
// Import the useAdmin hook
import { useAdmin } from "@/hooks/use-admin"
import { LayoutDashboard, ShieldAlert } from "lucide-react"
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
  const pathname = usePathname()
  const { user, isLoading } = useAuth()
  const [aboutUsOpen, setAboutUsOpen] = useState(false);


  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6 md:gap-10">
          <Logo />
          <nav className="hidden gap-6 md:flex">
            <Link
              href="/causes"
              className={`text-sm font-medium transition-colors hover:text-secondary ${pathname === "/causes" ? "text-foreground" : "text-muted-foreground"
                }`}
            >
              Causes
            </Link>
            <Link
              href="/how-it-works"
              className={`text-sm font-medium transition-colors hover:text-secondary ${pathname === "/how-it-works" ? "text-foreground" : "text-muted-foreground"
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
                className="absolute mt-2 py-4 bg-white shadow-lg rounded-md hidden lg:block"
                align="start"
              >
                <div className="">
                  <div className="flex">
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
                        Our Story (The &quot;Why&quot; Behind RefreeG)
                      </Link>
                    </DropdownMenuItem>
                  </div>
                  <div className="flex">
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
                  </div>

                  <DropdownMenuItem asChild>
                    <Link
                      href="/about-us/WhatWeDo"
                      className="whitespace-nowrap hover:underline hover:bg-[#D6EBFF] px-4 py-2 block"
                    >
                      What We Do
                    </Link>
                  </DropdownMenuItem>
                </div>
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
          <Link href="/dashboard/causes/create">
            <Button variant="outline" size="sm">
              List a Cause
            </Button>
          </Link>
          {!isLoading && !user ? (
            <div className="flex items-center gap-2">
              <Link href="/auth/signin">
                <Button size="sm" className="bg-[#0070E0]">Sign In</Button>
              </Link>
            </div>
          ) : (
            <UserNav />
          )}
        </div>
      </div>
    </header>
  )
}

