"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useAdmin } from "@/hooks/use-admin";
import { getProfile } from "@/actions/profile-actions";
import Link from "next/link";
import {
  ShieldAlert,
  Terminal,
  Flag,
  FileText,
  Building2,
  BadgeCheck,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Settings2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { getMediaUrl } from "@/lib/s3/media";
import { getOrganizationWorkspace } from "@/actions/organization-actions";

export function UserNav() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { isAdminOrManager } = useAdmin(user?.id);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        try {
          const profileData = await getProfile(user.id);
          setProfile(profileData);

          if (profileData?.account_type === "organization") {
            const result = await getOrganizationWorkspace();
            if (result.success) setOrganization(result.workspace);
          } else {
            setOrganization(null);
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [user]);

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

  return (
    <div className="pt-1.5">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-10 w-10 rounded-full border border-slate-200 bg-white p-0 shadow-sm transition-all hover:border-blue-300 hover:bg-white hover:ring-4 hover:ring-blue-50 data-[state=open]:border-blue-500 data-[state=open]:ring-4 data-[state=open]:ring-blue-50"
            aria-label="Open profile menu"
          >
            <Avatar className="h-9 w-9 rounded-full border-2 border-white">
              <AvatarImage
                src={personalAvatarUrl}
                alt={personalDisplayName || user.email || ""}
                className="object-cover"
              />
              <AvatarFallback className="rounded-full">
                {personalInitials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="max-h-[calc(100vh-6rem)] w-[320px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 shadow-[0_24px_70px_-20px_rgba(15,23,42,0.35)]"
          align="end"
          sideOffset={10}
          forceMount
        >
          <DropdownMenuLabel className="bg-[linear-gradient(135deg,#f8fbff_0%,#eef4ff_100%)] p-4 font-normal">
            <div className="flex items-center gap-3.5">
              <Avatar className="h-12 w-12 shrink-0 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-200">
                <AvatarImage
                  src={personalAvatarUrl}
                  alt={personalDisplayName || user.email || ""}
                  className="object-cover"
                />
                <AvatarFallback className="bg-blue-100 font-semibold text-blue-800">
                  {personalInitials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <p className="w-full truncate text-sm font-semibold leading-none text-slate-950">
                    {personalDisplayName}
                  </p>
                  {isVerified && (
                    <BadgeCheck className="h-4 w-4 flex-shrink-0 fill-blue-600 text-white" />
                  )}
                </div>
                <p className="w-full truncate text-xs leading-none text-slate-500">
                  {user.email}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">
                  Personal account
                </p>
              </div>
            </div>
          </DropdownMenuLabel>

          {isOrganization && (
            <div className="mx-3 mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <Avatar className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 bg-white">
                <AvatarImage
                  src={organizationLogoUrl}
                  alt={`${organization?.name || "Organisation"} logo`}
                  className="rounded-lg object-contain p-0.5"
                />
                <AvatarFallback className="rounded-lg bg-white text-[10px] font-semibold">
                  {organizationInitials || <Building2 className="h-3.5 w-3.5" />}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Organisation workspace
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
                  {organization?.name || "Organisation"}
                </p>
              </div>
              <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold capitalize text-blue-700">
                {organization?.currentUserRole || "Member"}
              </span>
            </div>
          )}

          {isAdminOrManager && (
            <div className="mx-3 mt-2">
              <div className="flex items-center gap-1.5 rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-700">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Administrative access enabled</span>
              </div>
            </div>
          )}

          <div className="p-2">
            <DropdownMenuLabel className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Personal
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link
                  href={personalProfileHref}
                  className="group flex h-10 cursor-pointer items-center gap-3 rounded-lg px-2.5 text-sm text-slate-700 focus:bg-blue-50 focus:text-blue-800"
                >
                  <UserRound className="h-4 w-4 text-slate-400 group-focus:text-blue-600" />
                  <span className="flex-1">
                    {isOrganization ? "Personal Profile" : "View Profile"}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard/settings/profile"
                  className="group flex h-10 cursor-pointer items-center gap-3 rounded-lg px-2.5 text-sm text-slate-700 focus:bg-blue-50 focus:text-blue-800"
                >
                  <Settings2 className="h-4 w-4 text-slate-400 group-focus:text-blue-600" />
                  <span className="flex-1">Profile Settings</span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            {isOrganization && (
              <>
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuLabel className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Organisation
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link
                      href={organizationProfileHref}
                      className="group flex h-10 cursor-pointer items-center gap-3 rounded-lg px-2.5 text-sm text-slate-700 focus:bg-blue-50 focus:text-blue-800"
                    >
                      <Building2 className="h-4 w-4 text-slate-400 group-focus:text-blue-600" />
                      <span className="flex-1">Organisation Profile</span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/dashboard/settings/organization"
                      className="group flex h-10 cursor-pointer items-center gap-3 rounded-lg px-2.5 text-sm text-slate-700 focus:bg-blue-50 focus:text-blue-800"
                    >
                      <UsersRound className="h-4 w-4 text-slate-400 group-focus:text-blue-600" />
                      <span className="flex-1">Team &amp; Organisation</span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            )}

            <DropdownMenuSeparator className="my-2" />
            <DropdownMenuLabel className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Account
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard"
                  className="group flex h-10 cursor-pointer items-center gap-3 rounded-lg px-2.5 text-sm text-slate-700 focus:bg-blue-50 focus:text-blue-800"
                >
                  <LayoutDashboard className="h-4 w-4 text-slate-400 group-focus:text-blue-600" />
                  <span className="flex-1">Dashboard</span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard/settings"
                  className="group flex h-10 cursor-pointer items-center gap-3 rounded-lg px-2.5 text-sm text-slate-700 focus:bg-blue-50 focus:text-blue-800"
                >
                  <Settings2 className="h-4 w-4 text-slate-400 group-focus:text-blue-600" />
                  <span className="flex-1">Account Settings</span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                </Link>
              </DropdownMenuItem>
              {!isVerified && (
                <DropdownMenuItem asChild>
                  <Link
                    href="/dashboard/settings/kyc"
                    className="group flex h-10 cursor-pointer items-center gap-3 rounded-lg px-2.5 text-sm text-slate-700 focus:bg-amber-50 focus:text-amber-800"
                  >
                    <BadgeCheck className="h-4 w-4 text-amber-500" />
                    <span className="flex-1">Identity Verification</span>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      Required
                    </span>
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </div>

          <DropdownMenuSeparator className="m-0" />

          {isAdminOrManager && (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                Admin Panel
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link
                    href="/dashboard/admin/causes"
                    className="cursor-pointer"
                  >
                    Manage Causes
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/dashboard/admin/users"
                    className="cursor-pointer"
                  >
                    Manage Users
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/dashboard/admin/petitions"
                    className="cursor-pointer"
                  >
                    Manage Petitions
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/admin/users/kyc" className="cursor-pointer">
                    KYC Reviews
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/dashboard/admin/api-reports"
                    className="cursor-pointer"
                  >
                    API Reports
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
            </>
          )}

          {profile?.account_type === "developer" && (
            <>
              <DropdownMenuLabel className="text-xs text-blue-600 font-normal">
                Developer Tools
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link
                    href="/dashboard/developer/api-keys"
                    className="cursor-pointer flex items-center gap-2"
                  >
                    <Terminal className="h-3 w-3" />
                    Console
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/docs/api"
                    className="cursor-pointer flex items-center gap-2"
                  >
                    <FileText className="h-3 w-3" />
                    Documentation
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/dashboard/developer/reports"
                    className="cursor-pointer flex items-center gap-2"
                  >
                    <Flag className="h-3 w-3" />
                    API Reports
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
            </>
          )}

          <div className="bg-slate-50 p-2">
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
              className="flex h-10 cursor-pointer items-center gap-3 rounded-lg px-2.5 text-sm font-medium text-red-600 transition-colors focus:bg-red-50 focus:text-red-700 disabled:opacity-50"
            >
              {isSigningOut ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Signing out...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </>
              )}
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
