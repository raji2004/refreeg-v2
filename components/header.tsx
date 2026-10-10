"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/user-nav";
import { useAuth } from "@/hooks/use-auth";
import { useAdmin } from "@/hooks/use-admin";
import { cn } from "@/lib/utils";
import { DiscoverSearch } from "@/components/discover/discover-search";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  Compass,
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
  // Star,
  Target,
  TargetIcon,
  Trophy,
  UserCog,
  Users,
  // Wallet,
  X,
} from "lucide-react";

type NavLink = {
  title: string;
  type: "link";
  href: string;
  icon: React.ComponentType<{ className?: string }>;
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
    title: "Discover",
    href: "/causes",
    type: "link",
    icon: Compass,
  },
  {
    title: "Community",
    href: "/community",
    type: "link",
    icon: Users,
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
      // Hidden until /rewards and /crypto pages exist.
      // {
      //   title: "RefreeG Rewards",
      //   description:
      //     "Get rewarded in points, crypto and recognition for driving impact.",
      //   href: "/rewards",
      //   icon: Star,
      // },
      // {
      //   title: "Crypto on RefreeG",
      //   description:
      //     "Support global causes seamlessly with fast, transparent crypto donations. Real-time tracking and low fees.",
      //   href: "/crypto",
      //   icon: Wallet,
      // },
      {
        title: "FAQ",
        description:
          "Find answers to common questions about using the platform, campaigns, and donations.",
        href: "/faq",
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
  // Hidden until /dashboard/crypto exists.
  // { title: "Crypto Wallet", href: "/dashboard/crypto", icon: Wallet },
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

function MobileRow({
  href,
  icon: Icon,
  active,
  children,
}: {
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex h-12 items-center justify-between gap-3 rounded-xl px-3 text-[15px] text-ink transition-colors hover:bg-gray-50",
        active && "bg-blue-accent/5 font-medium text-blue-accent",
      )}
    >
      <span className="flex items-center gap-3">
        {Icon ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-accent/10 text-blue-accent">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
        {children}
      </span>
      <ChevronRight className="h-4 w-4 text-gray-300 transition-colors group-hover:text-blue-accent" />
    </Link>
  );
}

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
    const themeMap: Record<string, { solid: string }> = {
      "/non-profits": {
        solid: "bg-[#7D568A] hover:bg-[#684973]",
      },
      "/businesses": {
        solid: "bg-[#008B73] hover:bg-[#00715d]",
      },
      "/healthcare": {
        solid: "bg-[#C03744] hover:bg-[#a92f3b]",
      },
      "/disaster-relief": {
        solid: "bg-[#151314] hover:bg-[#252224]",
      },
    };

    return (
      themeMap[pathname] ?? {
        solid: "bg-blue-accent hover:bg-blue-accent/90",
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
    <header className="sticky top-0 z-50 border-b border-hairline">
      <div
        className={cn(
          "overflow-visible transition-[background-color,backdrop-filter,box-shadow,border-color] duration-200",
          isScrolled
            ? "border-b border-hairline bg-surface/80 shadow-subtle backdrop-blur-xl"
            : "border-b border-transparent bg-surface shadow-none",
        )}
      >
        <div className="mx-auto max-w-[1440px]">
          <nav className="flex min-h-[88px] items-center justify-between gap-3 px-4 py-3 sm:px-5 lg:px-6">
            <div className="flex min-w-0 items-center gap-3 lg:gap-10 2xl:gap-12">
              <Link href="/" className="shrink-0" aria-label="RefreeG home">
                <Image
                  src="/logo.svg"
                  alt="RefreeG"
                  width={202}
                  height={62}
                  priority
                  className="h-auto w-[150px] sm:w-[202px] xl:w-[170px] 2xl:w-[202px]"
                />
              </Link>

              <div className="hidden xl:flex xl:items-center xl:gap-7 2xl:gap-[37px]">
                {publicNavItems.map((item) => {
                  if (item.type === "link") {
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`whitespace-nowrap text-sm transition-colors ${
                          isPathActive(pathname, item.href)
                            ? "font-medium text-ink"
                            : "text-ink/80 hover:text-ink"
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
                        className={`flex items-center gap-1 whitespace-nowrap py-2 text-sm transition-colors ${
                          isOpen ? "text-ink" : "text-ink/80 hover:text-ink"
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
                          className="absolute left-0 top-full z-50 pt-3"
                        >
                          <div
                            className={cn(
                              "max-w-[72vw] rounded-2xl border border-gray-200 bg-white p-2 shadow-lg",
                              item.items.length > 2 ? "w-[600px]" : "w-[360px]",
                            )}
                          >
                            <div className="px-3 pb-2 pt-2">
                              <Eyebrow className="text-[11px] font-medium tracking-[0.16em] text-blue-accent">
                                {item.title}
                              </Eyebrow>
                              <p className="mt-1 text-[13px] leading-5 text-gray-500">
                                {item.header}
                              </p>
                            </div>

                            <div
                              className={cn(
                                "grid gap-1",
                                item.items.length > 2 && "grid-cols-2",
                              )}
                            >
                              {item.items.map((dropdownItem) => {
                                const Icon = dropdownItem.icon;
                                const active = isPathActive(
                                  pathname,
                                  dropdownItem.href,
                                );

                                return (
                                  <Link
                                    key={dropdownItem.href}
                                    href={dropdownItem.href}
                                    className={cn(
                                      "group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-gray-50",
                                      active && "bg-blue-accent/5",
                                    )}
                                  >
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-accent/10 text-blue-accent transition-colors group-hover:bg-blue-accent group-hover:text-white">
                                      <Icon className="h-[18px] w-[18px]" />
                                    </span>
                                    <span className="min-w-0">
                                      <span className="block text-[15px] font-medium text-ink transition-colors group-hover:text-blue-accent">
                                        {dropdownItem.title}
                                      </span>
                                      <span className="mt-0.5 block text-[13px] leading-5 text-gray-500">
                                        {dropdownItem.description}
                                      </span>
                                    </span>
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 lg:gap-6">
              <div className="hidden md:block">
                <DiscoverSearch compact />
              </div>

              <div className="hidden lg:flex lg:items-center lg:gap-6">
                {user && !isDashboardRoute ? (
                  <Link
                    href="/dashboard"
                    className="whitespace-nowrap text-sm text-ink transition-colors hover:text-ink/70"
                  >
                    Dashboard
                  </Link>
                ) : null}

                {!isLoading && !user ? (
                  <>
                    <Link
                      href="/auth/signin"
                      className="whitespace-nowrap text-sm text-ink transition-colors hover:text-ink/70"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/auth/signup"
                      className="whitespace-nowrap text-sm text-ink transition-colors hover:text-ink/70"
                    >
                      Sign Up
                    </Link>
                  </>
                ) : null}

                <Link
                  href="/dashboard/causes/create"
                  className={`inline-flex h-[42px] items-center gap-5 whitespace-nowrap rounded-full pl-5 pr-[15px] text-sm font-medium text-white transition-colors ${activeTheme.solid}`}
                >
                  Start a Cause
                  <svg
                    viewBox="0 0 11 20"
                    className="h-[19px] w-[10px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.25}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M1 1l9 9-9 9" />
                  </svg>
                </Link>
              </div>

              {!isLoading && !user ? (
                <Link href="/auth/signup" className="lg:hidden">
                  <Button
                    size="sm"
                    className={`h-[42px] rounded-full px-5 text-sm font-medium text-white ${activeTheme.solid}`}
                  >
                    Sign Up
                  </Button>
                </Link>
              ) : null}

              {!isLoading && user ? <UserNav /> : null}

              <button
                type="button"
                onClick={() => setIsMenuOpen((open) => !open)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5 xl:hidden"
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
            className={cn(
              "overflow-hidden border-hairline bg-surface transition-all duration-300 xl:hidden",
              isMenuOpen
                ? "max-h-[calc(100vh-5rem)] border-t opacity-100"
                : "max-h-0 opacity-0",
            )}
          >
            <div className="max-h-[calc(100vh-5rem)] overflow-y-auto px-4 py-4 sm:px-5">
              <div className="rounded-2xl bg-warm-neutral p-4">
                <Eyebrow className="text-[11px] font-medium tracking-[0.16em] text-blue-accent">
                  Navigation
                </Eyebrow>
                <p className="mt-2 font-serif text-2xl text-ink">
                  Explore RefreeG{" "}
                  <em className="italic text-blue-accent">faster.</em>
                </p>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Jump into campaigns, petitions, platform guides, and your
                  workspace from one cleaner menu.
                </p>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Link
                    href="/dashboard/causes/create"
                    className={cn(
                      "flex h-11 items-center justify-center gap-2 rounded-full text-sm font-medium text-white transition-colors",
                      activeTheme.solid,
                    )}
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                      <Megaphone className="h-3.5 w-3.5" />
                    </span>
                    Start a Cause
                  </Link>
                  <Link
                    href="/dashboard/petitions/create"
                    className="flex h-11 items-center justify-center gap-2 rounded-full border border-ink text-sm font-medium text-ink transition-colors hover:bg-black/5"
                  >
                    <FileText className="h-4 w-4" />
                    Launch Petition
                  </Link>
                </div>
              </div>

              {user ? (
                <div className="mt-4">
                  <Eyebrow className="px-3 text-[11px] font-medium tracking-[0.16em] text-blue-accent">
                    Workspace
                  </Eyebrow>
                  <div className="mt-2 space-y-0.5">
                    {userDashboardItems.map((item) => (
                      <MobileRow
                        key={item.href}
                        href={item.href}
                        icon={item.icon}
                        active={isPathActive(pathname, item.href)}
                      >
                        {item.title}
                      </MobileRow>
                    ))}
                  </div>

                  {isAdminOrManager ? (
                    <div className="mt-3 border-t border-gray-200 pt-3">
                      <Eyebrow className="px-3 text-[11px] font-medium tracking-[0.16em] text-blue-accent">
                        Admin
                      </Eyebrow>
                      <div className="mt-2 space-y-0.5">
                        {adminDashboardItems.map((item) => (
                          <MobileRow
                            key={item.href}
                            href={item.href}
                            icon={item.icon}
                            active={isPathActive(pathname, item.href)}
                          >
                            {item.title}
                          </MobileRow>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-4 border-t border-gray-200 pt-4">
                <Eyebrow className="px-3 text-[11px] font-medium tracking-[0.16em] text-blue-accent">
                  Explore
                </Eyebrow>
                <div className="mt-2 space-y-0.5">
                  {publicNavItems.map((item) => {
                    if (item.type === "link") {
                      return (
                        <MobileRow
                          key={item.href}
                          href={item.href}
                          icon={item.icon}
                          active={isPathActive(pathname, item.href)}
                        >
                          {item.title}
                        </MobileRow>
                      );
                    }

                    const isOpen = openDropdown === item.title;

                    return (
                      <div key={item.title}>
                        <button
                          type="button"
                          onClick={() => toggleMobileDropdown(item.title)}
                          aria-expanded={isOpen}
                          className={cn(
                            "flex h-12 w-full items-center justify-between rounded-xl px-3 text-left text-[15px] text-ink transition-colors hover:bg-gray-50",
                            isOpen && "bg-gray-50",
                          )}
                        >
                          <span className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-accent/10 text-blue-accent">
                              <item.icon className="h-4 w-4" />
                            </span>
                            {item.title}
                          </span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 text-gray-400 transition-transform",
                              isOpen && "rotate-180",
                            )}
                          />
                        </button>

                        <div
                          className={cn(
                            "grid transition-all duration-300",
                            isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                          )}
                        >
                          <div className="overflow-hidden">
                            <div className="ml-[22px] mt-1 space-y-0.5 border-l border-gray-200 pb-2 pl-3">
                              <p className="px-3 pb-1 pt-1 text-[13px] leading-5 text-gray-500">
                                {item.header}
                              </p>
                              {item.items.map((subItem) => (
                                <Link
                                  key={subItem.href}
                                  href={subItem.href}
                                  className={cn(
                                    "group block rounded-xl px-3 py-2.5 transition-colors hover:bg-gray-50",
                                    isPathActive(pathname, subItem.href) &&
                                      "bg-blue-accent/5",
                                  )}
                                >
                                  <span className="block text-[15px] font-medium text-ink transition-colors group-hover:text-blue-accent">
                                    {subItem.title}
                                  </span>
                                  <span className="mt-0.5 block text-[13px] leading-5 text-gray-500">
                                    {subItem.description}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2 border-t border-gray-200 pt-4 sm:flex-row">
                {!isLoading && !user ? (
                  <>
                    <Link
                      href="/auth/signin"
                      className="flex h-11 w-full items-center justify-center rounded-full border border-ink text-sm font-medium text-ink transition-colors hover:bg-black/5 sm:flex-1"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/auth/signup"
                      className={cn(
                        "flex h-11 w-full items-center justify-center rounded-full text-sm font-medium text-white transition-colors sm:flex-1",
                        activeTheme.solid,
                      )}
                    >
                      Sign Up
                    </Link>
                  </>
                ) : null}

                {user && !isDashboardRoute ? (
                  <Link
                    href="/dashboard"
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-ink text-sm font-medium text-ink transition-colors hover:bg-black/5 sm:flex-1"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                ) : null}

                {user ? (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium text-rust transition-colors hover:bg-rust/10 disabled:opacity-50"
                  >
                    <LogOut className="h-4 w-4" />
                    {isSigningOut ? "Signing out..." : "Sign Out"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
