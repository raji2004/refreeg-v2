"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Home,
  FileText,
  Users,
  HelpCircle,
  Info,
  X,
  LayoutDashboard,
  Settings,
  BarChart3,
  UserCog,
  ClipboardCheckIcon,
  Shield,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAdmin } from "@/hooks/use-admin";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isDashboard?: boolean;
}

const mainNavItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Causes",
    href: "/causes",
    icon: FileText,
  },
  {
    title: "Petitions",
    href: "/petitions",
    icon: Users,
  },
  {
    title: "How It Works",
    href: "/how-it-works",
    icon: HelpCircle,
  },
  {
    title: "About Us",
    href: "/about-us/OurMission",
    icon: Info,
  },
];

const dashboardNavItems = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "My Causes",
    href: "/dashboard/causes",
    icon: FileText,
  },
  {
    title: "My Petitions",
    href: "/dashboard/petitions",
    icon: FileText,
  },
  {
    title: "My Donations",
    href: "/dashboard/donations",
    icon: Users,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

const adminNavItems = [
  {
    title: "Manage Causes",
    href: "/dashboard/admin/causes",
    icon: FileText,
  },
  {
    title: "Manage Petitions",
    href: "/dashboard/admin/petitions",
    icon: FileText,
  },
  {
    title: "Manage Users",
    href: "/dashboard/admin/users",
    icon: UserCog,
  },
  {
    title: "Analytics",
    href: "/dashboard/admin/analytics",
    icon: BarChart3,
  },
  {
    title: "Logs",
    href: "/dashboard/admin/logs",
    icon: ClipboardCheckIcon,
  },
];

const aboutUsSubroutes = [
  { title: "Our Mission", href: "/about-us/OurMission" },
  { title: "Our Impact", href: "/about-us/OurImpact" },
  { title: "Our Story", href: "/about-us/OurStory" },
  { title: "What We Do", href: "/about-us/WhatWeDo" },
];

export function MobileSidebar({
  isOpen,
  onClose,
  isDashboard = false,
}: MobileSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isAdminOrManager } = useAdmin(user?.id);
  const [aboutUsOpen, setAboutUsOpen] = useState(false);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0  z-40 md:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-80 z-50 border-l shadow-lg transform transition-transform duration-300 ease-in-out md:hidden",
          "bg-blue-100", // 🔥 force solid background for light/dark
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">
              {isDashboard ? "Dashboard" : "Menu"}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col p-4 gap-4 bg-blue-100 shadow-lg">
            <div className="space-y-2">
              {isDashboard ? (
                <>
                  {dashboardNavItems.map((item) => {
                    const isActive = pathname === item.href;

                    return (
                      <Link key={item.href} href={item.href}>
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-start",
                            isActive && "bg-secondary"
                          )}
                        >
                          <item.icon className="mr-3 h-4 w-4" />
                          {item.title}
                        </Button>
                      </Link>
                    );
                  })}

                  {isAdminOrManager && (
                    <>
                      <div className="my-4">
                        <div className="mb-2 px-2 text-xs font-semibold tracking-tight flex items-center">
                          <Shield className="mr-1 h-3 w-3" />
                          Admin
                        </div>
                        {adminNavItems.map((item) => {
                          const isActive =
                            pathname === item.href ||
                            pathname.startsWith(`${item.href}/`);

                          return (
                            <Link key={item.href} href={item.href}>
                              <Button
                                variant={isActive ? "secondary" : "ghost"}
                                className={cn(
                                  "w-full justify-start",
                                  isActive && "bg-secondary"
                                )}
                              >
                                <item.icon className="mr-3 h-4 w-4" />
                                {item.title}
                              </Button>
                            </Link>
                          );
                        })}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  {mainNavItems.map((item) => {
                    if (item.title === "About Us") {
                      const isActive = pathname.startsWith("/about-us");
                      return (
                        <div key={item.href}>
                          <Button
                            variant={isActive ? "secondary" : "ghost"}
                            className={cn(
                              "w-full justify-start flex items-center",
                              isActive && "bg-secondary"
                            )}
                            onClick={() => setAboutUsOpen((v) => !v)}
                            aria-expanded={aboutUsOpen}
                            aria-controls="about-us-subnav"
                          >
                            <item.icon className="mr-3 h-4 w-4" />
                            {item.title}
                            {aboutUsOpen ? (
                              <ChevronUp className="ml-auto h-4 w-4" />
                            ) : (
                              <ChevronDown className="ml-auto h-4 w-4" />
                            )}
                          </Button>
                          {aboutUsOpen && (
                            <div
                              id="about-us-subnav"
                              className="ml-8 mt-1 space-y-1"
                            >
                              {aboutUsSubroutes.map((sub) => (
                                <Link key={sub.href} href={sub.href}>
                                  <Button
                                    variant={
                                      pathname === sub.href
                                        ? "secondary"
                                        : "ghost"
                                    }
                                    className={cn(
                                      "w-full justify-start text-sm",
                                      pathname === sub.href && "bg-secondary"
                                    )}
                                    onClick={onClose}
                                  >
                                    {sub.title}
                                  </Button>
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/dashboard" &&
                        pathname.startsWith(item.href));
                    return (
                      <Link key={item.href} href={item.href}>
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-start",
                            isActive && "bg-secondary"
                          )}
                          onClick={onClose}
                        >
                          <item.icon className="mr-3 h-4 w-4" />
                          {item.title}
                        </Button>
                      </Link>
                    );
                  })}
                </>
              )}
            </div>

            {/* User section */}
            {user && (
              <div className="flex flex-col gap-2">
                <Link href="/dashboard/causes/create">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="mr-3 h-4 w-4" />
                    List a Cause
                  </Button>
                </Link>
                <Link href="/dashboard/petitions/create">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="mr-3 h-4 w-4" />
                    Create a Petition
                  </Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </>
  );
}
