"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/user-nav";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/logo";
import { useAdmin } from "@/hooks/use-admin";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheckIcon,
  FileText,
  HandHeart,
  HeartHandshake,
  HelpCircle,
  Home,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Menu,
  Megaphone,
  Shield,
  Share2,
  Sparkles,
  Star,
  Target,
  TargetIcon,
  UserCog,
  Users,
  Wallet,
  X,
} from "lucide-react";

type NavLink = {
  title: string;
  type: "link";
  href: string;
};

type NavDropdownItem = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavDropdown = {
  title: string;
  type: "dropdown";
  icon: React.ComponentType<{ className?: string }>;
  header: string;
  items: NavDropdownItem[];
};

type NavItem = NavLink | NavDropdown;

const publicNavItems: NavItem[] = [
  {
    title: "Explore Causes",
    href: "/causes",
    type: "link",
  },
  {
    title: "What can I crowdfund?",
    header: "Curious about what you crowdfund for? Here are some ideas:",
    icon: HandHeart,
    type: "dropdown",
    items: [
      {
        title: "RefreeG for Businesses",
        description:
          "Empower your brand with purpose. Launch CSR campaigns, support community-driven causes, and connect with customers who care about impact.",
        href: "/businesses",
        icon: CircleDollarSign,
      },
      {
        title: "RefreeG for Nonprofits",
        description:
          "Raise more, reach more. Build trust with transparent fundraising tools designed to help nonprofits thrive and grow their donor communities.",
        href: "/non-profits",
        icon: Target,
      },
      {
        title: "RefreeG for Disaster Relief",
        description:
          "Rally urgent support for communities hit by disasters and get aid to those who need it; quickly and securely.",
        href: "/disaster-relief",
        icon: HeartHandshake,
      },
      {
        title: "RefreeG for Healthcare",
        description:
          "Give hope a platform. Raise funds for medical bills, healthcare projects, or critical treatments with transparency and community support.",
        href: "/healthcare",
        icon: FileText,
      },
    ],
  },
  {
    title: "How RefreeG works",
    header: "Everything you need to launch, manage, and grow a campaign.",
    icon: Lightbulb,
    type: "dropdown",
    items: [
      {
        title: "How to start a cause",
        description:
          "Set up a cause quickly with an opinionated workflow built for clarity and speed.",
        href: "/dashboard/causes/create",
        icon: Star,
      },
      {
        title: "Fees & Payouts",
        description:
          "Understand transaction fees, payout timelines, and how funds move across the platform.",
        href: "/crowdfund/fees",
        icon: CircleDollarSign,
      },
      {
        title: "FAQ",
        description:
          "Read the most common questions around fundraising, petitions, verification, and payouts.",
        href: "/#faq",
        icon: HelpCircle,
      },
    ],
  },
  {
    title: "About RefreeG",
    header: "The thinking and mission behind the platform.",
    icon: Sparkles,
    type: "dropdown",
    items: [
      {
        title: "Our Mission",
        description:
          "See the mission driving RefreeG and the product direction behind the platform.",
        href: "/about-us/OurMission",
        icon: TargetIcon,
      },
    ],
  },
];

const userDashboardItems = [
  { title: "Overview", href: "/dashboard", icon: Home },
  { title: "My Causes", href: "/dashboard/causes", icon: FileText },
  { title: "My Petitions", href: "/dashboard/petitions", icon: FileText },
  { title: "My Donations", href: "/dashboard/donations", icon: Users },
  { title: "Crypto Wallet", href: "/dashboard/crypto", icon: Wallet },
  { title: "Referrals", href: "/referrals", icon: Share2 },
];

const adminDashboardItems = [
  { title: "Manage Causes", href: "/dashboard/admin/causes", icon: FileText },
  {
    title: "Manage Petitions",
    href: "/dashboard/admin/petitions",
    icon: FileText,
  },
  { title: "Manage Users", href: "/dashboard/admin/users", icon: UserCog },
  { title: "Analytics", href: "/dashboard/admin/analytics", icon: BarChart3 },
  { title: "Logs", href: "/dashboard/admin/logs", icon: ClipboardCheckIcon },
];

const isPathActive = (pathname: string, href: string) => {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
};

export function Header() {
  const pathname = usePathname();
  const { user, isLoading, signOut } = useAuth();
  const { isAdminOrManager } = useAdmin(user?.id);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const isDashboardRoute = pathname.startsWith("/dashboard");

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  useEffect(() => {
    setIsMenuOpen(false);
    setOpenDropdown(null);
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const activeTheme = useMemo(() => {
    const themeMap: Record<
      string,
      { outline: string; solid: string; subtle: string }
    > = {
      "/non-profits": {
        outline: "border-[#7D568A] text-[#7D568A] hover:bg-[#7D568A]",
        solid: "bg-[#7D568A] hover:bg-[#684973]",
        subtle: "bg-[#F5EDFA] text-[#7D568A]",
      },
      "/businesses": {
        outline: "border-[#008B73] text-[#008B73] hover:bg-[#008B73]",
        solid: "bg-[#008B73] hover:bg-[#00715d]",
        subtle: "bg-[#E8F8F4] text-[#008B73]",
      },
      "/healthcare": {
        outline: "border-[#C03744] text-[#C03744] hover:bg-[#C03744]",
        solid: "bg-[#C03744] hover:bg-[#a92f3b]",
        subtle: "bg-[#FCECEF] text-[#C03744]",
      },
      "/disaster-relief": {
        outline: "border-[#151314] text-[#151314] hover:bg-[#151314]",
        solid: "bg-[#151314] hover:bg-[#252224]",
        subtle: "bg-[#F2F1F1] text-[#151314]",
      },
    };

    return (
      themeMap[pathname] ?? {
        outline: "border-blue-700 text-blue-700 hover:bg-blue-700",
        solid: "bg-blue-700 hover:bg-blue-800",
        subtle: "bg-blue-50 text-blue-700",
      }
    );
  }, [pathname]);

  const openMenu = (title: string) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setOpenDropdown(title);
  };

  const scheduleCloseMenu = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 140);
  };

  const toggleMobileDropdown = (title: string) => {
    setOpenDropdown((current) => (current === title ? null : title));
  };

  const handleSignOut = async () => {
    if (isSigningOut || !signOut) return;

    try {
      setIsSigningOut(true);
      setIsMenuOpen(false);
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
      setIsSigningOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 px-0 pt-0 sm:px-0 sm:pt-0 border-b">
      <div
        className={cn(
          "overflow-visible transition-[background-color,backdrop-filter,box-shadow,border-color] duration-200",
          isScrolled
            ? "border-b border-slate-200/80 bg-white/70 shadow-[0_18px_40px_-36px_rgba(15,23,42,0.45)] backdrop-blur-xl"
            : "border-b border-transparent bg-white/95 shadow-none"
        )}
      >
        <div className="mx-auto max-w-7xl">
          <nav className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 lg:px-6">
            <div className="flex min-w-0 items-center gap-3 lg:gap-6">
              <Link href="/" className="shrink-0">
                <Logo />
              </Link>

              <div className="hidden xl:flex xl:items-center xl:gap-1">
                {publicNavItems.map((item) => {
                  if (item.type === "link") {
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                          isPathActive(pathname, item.href)
                            ? "bg-blue-50 text-blue-700"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                        }`}
                      >
                        {item.title}
                      </Link>
                    );
                  }

                  const isOpen = openDropdown === item.title;

                  return (
                    <div
                      key={item.title}
                      className="relative"
                      onMouseEnter={() => openMenu(item.title)}
                      onMouseLeave={scheduleCloseMenu}
                    >
                      <button
                        type="button"
                        className={`flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                          isOpen
                            ? "bg-slate-100 text-slate-950"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                        }`}
                      >
                        <span>{item.title}</span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {isOpen && (
                        <div
                          onMouseEnter={() => openMenu(item.title)}
                          onMouseLeave={scheduleCloseMenu}
                          className="absolute left-0 top-full z-50 mt-3 w-[640px] max-w-[72vw] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_70px_-38px_rgba(15,23,42,0.45)]"
                        >
                          <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${activeTheme.subtle}`}>
                                <item.icon className="h-5 w-5" />
                              </span>
                              <div>
                                <p className="text-sm font-semibold text-slate-950">
                                  {item.title}
                                </p>
                                <p className="mt-1 text-sm text-slate-600">
                                  {item.header}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-3 p-4 md:grid-cols-2">
                            {item.items.map((dropdownItem) => {
                              const Icon = dropdownItem.icon;

                              return (
                                <Link
                                  key={dropdownItem.href}
                                  href={dropdownItem.href}
                                  className="group rounded-[22px] border border-slate-200/70 bg-slate-50/55 p-4 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/60"
                                >
                                  <div className="flex items-start gap-3">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm transition-colors group-hover:bg-blue-700 group-hover:text-white">
                                      <Icon className="h-5 w-5" />
                                    </span>
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-slate-950 transition-colors group-hover:text-blue-700">
                                        {dropdownItem.title}
                                      </p>
                                      <p className="mt-1 text-sm leading-6 text-slate-600">
                                        {dropdownItem.description}
                                      </p>
                                    </div>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden lg:flex lg:items-center lg:gap-2">
                {user && !isDashboardRoute ? (
                  <Link href="/dashboard">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full px-4 text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                    >
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Button>
                  </Link>
                ) : null}

                <Link href="/dashboard/causes/create">
                  <Button
                    size="sm"
                    className={`rounded-full px-4 text-white ${activeTheme.solid}`}
                  >
                    Start a Cause
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>

              {!isLoading && !user ? (
                <Link href="/auth/signin" className="lg:hidden">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-10 rounded-full border px-3 text-xs ${activeTheme.outline} bg-white transition-colors hover:text-white sm:px-4 sm:text-sm`}
                  >
                    Sign In
                  </Button>
                </Link>
              ) : null}

              {!isLoading && !user ? (
                <Link href="/auth/signin" className="hidden lg:block">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`rounded-full border ${activeTheme.outline} bg-white transition-colors hover:text-white`}
                  >
                    Sign In
                  </Button>
                </Link>
              ) : null}

              {!isLoading && user ? <UserNav /> : null}

              <button
                type="button"
                onClick={() => setIsMenuOpen((open) => !open)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-100 xl:hidden"
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              >
                {isMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </nav>

          <div
            className={`overflow-hidden border-t border-slate-100 bg-white/95 transition-all duration-300 xl:hidden ${
              isMenuOpen ? "max-h-[calc(100vh-5rem)] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="max-h-[calc(100vh-5rem)] overflow-y-auto px-4 py-4 sm:px-5">
              <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_100%)] p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Navigation
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  Explore RefreeG faster
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Jump into campaigns, petitions, platform guides, and your
                  workspace from one cleaner menu.
                </p>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Link href="/dashboard/causes/create">
                    <Button
                      className={`h-11 w-full rounded-2xl text-white ${activeTheme.solid}`}
                    >
                      <Megaphone className="mr-2 h-4 w-4" />
                      Start a Cause
                    </Button>
                  </Link>
                  <Link href="/dashboard/petitions/create">
                    <Button
                      variant="outline"
                      className="h-11 w-full rounded-2xl border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Launch Petition
                    </Button>
                  </Link>
                </div>
              </div>

              {user ? (
                <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="px-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Workspace
                  </p>
                  <div className="mt-3 space-y-1">
                    {userDashboardItems.map((item) => {
                      const Icon = item.icon;
                      const active = isPathActive(pathname, item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center justify-between rounded-2xl px-3 py-3 text-sm transition-colors ${
                            active
                              ? "bg-blue-50 text-blue-700"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                              <Icon className="h-4 w-4" />
                            </span>
                            {item.title}
                          </span>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      );
                    })}
                  </div>

                  {isAdminOrManager ? (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <p className="px-2 text-xs font-semibold uppercase tracking-[0.22em] text-rose-600">
                        Admin
                      </p>
                      <div className="mt-3 space-y-1">
                        {adminDashboardItems.map((item) => {
                          const Icon = item.icon;
                          const active = isPathActive(pathname, item.href);

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={`flex items-center justify-between rounded-2xl px-3 py-3 text-sm transition-colors ${
                                active
                                  ? "bg-blue-50 text-blue-700"
                                  : "text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              <span className="flex items-center gap-3">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                                  <Icon className="h-4 w-4" />
                                </span>
                                {item.title}
                              </span>
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm">
                <p className="px-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Explore
                </p>
                <div className="mt-3 space-y-2">
                  {publicNavItems.map((item) => {
                    if (item.type === "link") {
                      const active = isPathActive(pathname, item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-medium transition-colors ${
                            active
                              ? "bg-blue-50 text-blue-700"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <span>{item.title}</span>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      );
                    }

                    const isOpen = openDropdown === item.title;

                    return (
                      <div
                        key={item.title}
                        className="overflow-hidden rounded-[22px] border border-slate-200"
                      >
                        <button
                          type="button"
                          onClick={() => toggleMobileDropdown(item.title)}
                          className="flex w-full items-center justify-between px-3 py-3 text-left text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50"
                        >
                          <span className="flex items-center gap-3">
                            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${activeTheme.subtle}`}>
                              <item.icon className="h-4 w-4" />
                            </span>
                            {item.title}
                          </span>
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        <div
                          className={`grid transition-all duration-300 ${
                            isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                          }`}
                        >
                          <div className="overflow-hidden">
                            <div className="border-t border-slate-200 bg-slate-50/70 p-3">
                              <p className="mb-3 px-1 text-sm text-slate-600">
                                {item.header}
                              </p>
                              <div className="space-y-2">
                                {item.items.map((subItem) => {
                                  const Icon = subItem.icon;

                                  return (
                                    <Link
                                      key={subItem.href}
                                      href={subItem.href}
                                      className="flex items-start gap-3 rounded-2xl bg-white px-3 py-3 transition-colors hover:bg-blue-50"
                                    >
                                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                                        <Icon className="h-4 w-4" />
                                      </span>
                                      <span className="min-w-0">
                                        <span className="block text-sm font-semibold text-slate-900">
                                          {subItem.title}
                                        </span>
                                        <span className="mt-1 block text-sm leading-6 text-slate-600">
                                          {subItem.description}
                                        </span>
                                      </span>
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {!isLoading && !user ? (
                  <Link href="/auth/signin" className="w-full sm:flex-1">
                    <Button
                      variant="outline"
                      className={`h-11 w-full rounded-2xl border ${activeTheme.outline} bg-white transition-colors hover:text-white`}
                    >
                      Sign In
                    </Button>
                  </Link>
                ) : null}

                {user && !isDashboardRoute ? (
                  <Link href="/dashboard" className="w-full sm:flex-1">
                    <Button
                      variant="outline"
                      className="h-11 w-full rounded-2xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                    >
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Button>
                  </Link>
                ) : null}

                {user ? (
                  <Button
                    variant="ghost"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="h-11 rounded-2xl text-slate-700 hover:bg-rose-50 hover:text-rose-700"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {isSigningOut ? "Signing out..." : "Sign Out"}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
