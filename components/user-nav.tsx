"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useAdmin } from "@/hooks/use-admin";
import { useProfile } from "@/hooks/use-profile";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { getMediaUrl } from "@/lib/s3/media";
import { getOrganizationWorkspace } from "@/actions/organization-actions";

export function UserNav() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile(user?.id);
  const [organization, setOrganization] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { isAdminOrManager } = useAdmin(user?.id);
  const isOrganizationAccount = profile?.account_type === "organization";

  useEffect(() => {
    if (!isOrganizationAccount) {
      setOrganization(null);
      return;
    }

    let cancelled = false;
    getOrganizationWorkspace()
      .then((result) => {
        if (!cancelled && result.success) setOrganization(result.workspace);
      })
      .catch((error) => console.error("Error fetching workspace:", error));

    return () => {
      cancelled = true;
    };
  }, [isOrganizationAccount]);

  if (!user) return null;

  const isOrganization = profile?.account_type === "organization";
  const personalDisplayName = profile?.full_name || user.email;
  const personalAvatarUrl =
    getMediaUrl(profile?.profile_photo) ||
    (user.user_metadata?.avatar_url as string);
  const personalInitials = personalDisplayName
    ? personalDisplayName
        .split("@")[0]
        .split(/[\s.]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : "U";
  const organizationLogoUrl = isOrganization
    ? getMediaUrl(organization?.logoUrl)
    : "";
  const organizationInitials = organization?.name
    ? organization.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part: string) => part[0])
        .join("")
        .toUpperCase()
    : "";
  const organizationProfileHref = profile?.username
    ? `/${profile.username}`
    : "/dashboard/settings/organization";
  const personalProfileHref = profile?.username
    ? isOrganization
      ? `/${profile.username}?view=personal`
      : `/${profile.username}`
    : "/dashboard/settings/profile";

  const isVerified = profile?.is_verified || false;

  const item =
    "flex h-10 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-[15px] text-ink focus:bg-bone focus:text-ink";
  const sectionLabel =
    "px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/45";
  const MenuLink = ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <DropdownMenuItem asChild>
      <Link href={href} className={item}>
        {children}
      </Link>
    </DropdownMenuItem>
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-blue-accent"
          aria-label="Open profile menu"
        >
          <Avatar className="h-9 w-9 rounded-full">
            <AvatarImage
              src={personalAvatarUrl}
              alt=""
              className="object-cover"
            />
            <AvatarFallback className="rounded-full bg-forest text-xs font-semibold text-lime">
              {personalInitials}
            </AvatarFallback>
          </Avatar>
          <ChevronDown className="h-4 w-4 text-ink/50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="max-h-[calc(100vh-6rem)] w-[280px] overflow-y-auto rounded-2xl border border-hairline bg-surface p-2 shadow-[0_24px_60px_-24px_hsl(var(--ink)/0.35)]"
        align="end"
        sideOffset={10}
      >
        <div className="flex items-center gap-3 px-3 pb-3 pt-2">
          <Avatar className="h-10 w-10 shrink-0 rounded-full">
            <AvatarImage
              src={personalAvatarUrl}
              alt=""
              className="object-cover"
            />
            <AvatarFallback className="rounded-full bg-forest text-sm font-semibold text-lime">
              {personalInitials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-ink">
              {personalDisplayName}
            </p>
            <p className="truncate text-xs text-ink/55">{user.email}</p>
          </div>
        </div>

        <DropdownMenuGroup>
          <MenuLink href="/dashboard/settings/profile">Your profile</MenuLink>
          <MenuLink href="/dashboard/settings/kyc">
            Verification
            <span
              className={
                isVerified
                  ? "rounded-full bg-forest/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-forest"
                  : "rounded-full bg-gold/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink"
              }
            >
              {isVerified ? "Verified" : "Not verified"}
            </span>
          </MenuLink>
          <MenuLink href="/dashboard/settings/bank">Payment methods</MenuLink>
          <MenuLink href="/dashboard/settings">Settings</MenuLink>
        </DropdownMenuGroup>

        {isOrganization && (
          <>
            <DropdownMenuSeparator className="my-2 bg-hairline" />
            <p className={sectionLabel}>
              {organization?.name || "Organisation"}
              {organization?.currentUserRole
                ? ` · ${organization.currentUserRole}`
                : ""}
            </p>
            <DropdownMenuGroup>
              <MenuLink href={organizationProfileHref}>
                Organisation profile
              </MenuLink>
              <MenuLink href="/dashboard/settings/organization">
                Team &amp; organisation
              </MenuLink>
              <MenuLink href={personalProfileHref}>Personal profile</MenuLink>
            </DropdownMenuGroup>
          </>
        )}

        {isAdminOrManager && (
          <>
            <DropdownMenuSeparator className="my-2 bg-hairline" />
            <p className={sectionLabel}>Admin</p>
            <DropdownMenuGroup>
              <MenuLink href="/dashboard/admin/causes">Manage causes</MenuLink>
              <MenuLink href="/dashboard/admin/users">Manage users</MenuLink>
              <MenuLink href="/dashboard/admin/petitions">
                Manage petitions
              </MenuLink>
              <MenuLink href="/dashboard/admin/users/kyc">KYC reviews</MenuLink>
              <MenuLink href="/dashboard/admin/api-reports">
                API reports
              </MenuLink>
            </DropdownMenuGroup>
          </>
        )}

        {profile?.account_type === "developer" && (
          <>
            <DropdownMenuSeparator className="my-2 bg-hairline" />
            <p className={sectionLabel}>Developer</p>
            <DropdownMenuGroup>
              <MenuLink href="/dashboard/developer/api-keys">Console</MenuLink>
              <MenuLink href="/docs/api">Documentation</MenuLink>
              <MenuLink href="/dashboard/developer/reports">
                API reports
              </MenuLink>
            </DropdownMenuGroup>
          </>
        )}

        <DropdownMenuSeparator className="my-2 bg-hairline" />
        <DropdownMenuItem
          onClick={async () => {
            if (isSigningOut) return;
            try {
              setIsSigningOut(true);
              setOpen(false);
              await signOut();
            } catch (error) {
              console.error("Error signing out:", error);
              setIsSigningOut(false);
              setOpen(false);
            }
          }}
          disabled={isSigningOut}
          className="flex h-10 cursor-pointer items-center rounded-lg px-3 text-[15px] font-medium text-rust focus:bg-rust/10 focus:text-rust disabled:opacity-50"
        >
          {isSigningOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
