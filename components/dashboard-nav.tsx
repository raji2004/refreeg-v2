"use client";

import type React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import {
  ArrowUpRight,
  FileText,
  Home,
  Settings,
  Users,
  Shield,
  UserCog,
  ClipboardCheckIcon,
  Share2,
  Flag,
  Activity,
  Terminal,
  Sparkles,
  Building2,
  CircleUserRound,
  ShieldCheck
} from "lucide-react";
import { useAdmin } from "@/hooks/use-admin";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { Skeleton } from "@/components/ui/skeleton";
import { getOrganizationWorkspace } from "@/actions/organization-actions";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";

const userNavItems = [
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
  {
    title: "Referrals",
    href: "/referrals",
    icon: Share2,
  },
];

const getOrganizationNavItems = (username?: string | null) => [
  {
    title: "Overview",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "Campaigns",
    href: "/dashboard/causes",
    icon: FileText,
  },
  {
    title: "Petitions",
    href: "/dashboard/petitions",
    icon: FileText,
  },
  {
    title: "Donations",
    href: "/dashboard/donations",
    icon: Users,
  },
  {
    title: "My personal profile",
    href: username
      ? `/${username}?view=personal`
      : "/dashboard/settings/profile",
    icon: CircleUserRound,
  },
  {
    title: "Team & organisation",
    href: "/dashboard/settings/organization",
    icon: Building2,
  },
  {
    title: "Account settings",
    href: "/dashboard/settings/account",
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
    title: "Manage Proof Updates",
    href: "/dashboard/admin/proof-updates",
    icon: ShieldCheck,
  },
  {
    title: "Analytics",
    href: "/dashboard/admin/analytics",
    icon: Activity,
  },
  {
    title: "API Monitoring",
    href: "/dashboard/admin/api-monitoring",
    icon: Activity,
  },
  {
    title: "Logs",
    href: "/dashboard/admin/logs",
    icon: ClipboardCheckIcon,
  },
  {
    title: "API Reports",
    href: "/dashboard/admin/api-reports",
    icon: Flag,
  },
];

const developerNavItems = [
  {
    title: "Developer Tools",
    href: "/dashboard/developer",
    icon: Terminal,
  },
  {
    title: "API Reports",
    href: "/dashboard/developer/reports",
    icon: Flag,
  },
];

const isNavItemActive = (pathname: string, href: string) => {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
};

function NavItem({
  href,
  title,
  icon: Icon,
  active,
}: {
  href: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center justify-between rounded-2xl border px-3 py-3 text-sm transition-all",
        active
          ? "border-blue-200 bg-[linear-gradient(135deg,rgba(37,99,235,0.14),rgba(255,255,255,0.96))] text-slate-950 shadow-[0_12px_30px_-18px_rgba(37,99,235,0.9)]"
          : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-950",
      )}
    >
      <span className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-2xl transition-colors",
            active
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="font-medium">{title}</span>
      </span>
      <ArrowUpRight
        className={cn(
          "h-4 w-4 transition-all",
          active
            ? "translate-x-0 text-blue-600"
            : "text-slate-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-blue-500",
        )}
      />
    </Link>
  );
}

function NavSection({
  title,
  icon: Icon,
  children,
  accentClassName = "text-slate-500",
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  accentClassName?: string;
}) {
  return (
    <section className="space-y-3">
      <div
        className={cn(
          "flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.22em]",
          accentClassName,
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        <span>{title}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function DashboardNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isAdminOrManager, isLoading: adminLoading } = useAdmin(user?.id);
  const { profile, isLoading: profileLoading } = useProfile(user?.id);
  const [organization, setOrganization] = useState<any>(null);
  const [organizationLoading, setOrganizationLoading] = useState(false);

  const isOrganization = profile?.account_type === "organization";
  const isLoading =
    adminLoading || profileLoading || (isOrganization && organizationLoading);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOrganization) {
      setOrganization(null);
      setOrganizationLoading(false);
      return;
    }

    let cancelled = false;
    setOrganizationLoading(true);

    getOrganizationWorkspace()
      .then((result) => {
        if (!cancelled && result.success) {
          setOrganization(result.workspace);
        }
      })
      .finally(() => {
        if (!cancelled) setOrganizationLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOrganization]);

  if (isLoading) {
    // We only show skeletons for the admin part to prevent hydration mismatch
    // The user nav items are static and should always render
  }

  const primaryNavItems = isOrganization
    ? getOrganizationNavItems(profile?.username)
    : userNavItems;
  const organizationLogoUrl = getMediaUrl(organization?.logoUrl);

  return (
    <nav className="space-y-6">
      <div className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.98))] p-4 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.45)]">
        {isOrganization ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {organizationLogoUrl ? (
                  <Image
                    src={organizationLogoUrl}
                    alt={`${organization?.name || "Organisation"} logo`}
                    width={48}
                    height={48}
                    className="h-full w-full object-contain p-1"
                    unoptimized={isProxyMediaUrl(organizationLogoUrl)}
                  />
                ) : (
                  <Building2 className="h-5 w-5 text-slate-500" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                  Organisation
                </p>
                <p className="mt-1 truncate text-base font-semibold text-slate-950">
                  {organization?.name || "Workspace"}
                </p>
                <p className="text-xs capitalize text-slate-500">
                  {organization?.currentUserRole || "Member"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_55%),linear-gradient(180deg,#0f172a_0%,#172554_100%)] p-4 text-white">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-100/90">
              <Sparkles className="h-3.5 w-3.5" />
              Workspace
            </div>
            <p className="mt-3 text-lg font-semibold leading-tight">
              Your RefreeG control room
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              Manage causes, petitions, donations, and account settings from one
              place.
            </p>
          </div>
        )}

        <div className="mt-4 space-y-6">
          <NavSection title="Main" icon={Home}>
            {primaryNavItems.map((item) => {
              const active = isNavItemActive(pathname, item.href);
              return (
                <NavItem
                  key={item.href}
                  href={item.href}
                  title={item.title}
                  icon={item.icon}
                  active={active}
                />
              );
            })}
          </NavSection>

          {mounted && isLoading ? (
            <div className="space-y-3">
              <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Role Access
              </div>
              {adminNavItems.map((item) => (
                <Skeleton
                  key={item.href}
                  className="h-[62px] w-full rounded-2xl"
                />
              ))}
            </div>
          ) : null}

          {mounted && isAdminOrManager ? (
            <NavSection
              title="Admin"
              icon={Shield}
              accentClassName="text-rose-600"
            >
              {adminNavItems.map((item) => {
                const active = isNavItemActive(pathname, item.href);
                return (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    title={item.title}
                    icon={item.icon}
                    active={active}
                  />
                );
              })}
            </NavSection>
          ) : null}

          {mounted && profile?.account_type === "developer" ? (
            <NavSection
              title="Developer"
              icon={Terminal}
              accentClassName="text-blue-600"
            >
              {developerNavItems.map((item) => {
                const active = isNavItemActive(pathname, item.href);
                return (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    title={item.title}
                    icon={item.icon}
                    active={active}
                  />
                );
              })}
            </NavSection>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
