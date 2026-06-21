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
  CheckCircle,
  Terminal,
  Flag,
  FileText,
} from "lucide-react";
import { getMediaUrl } from "@/lib/s3/media";

export function UserNav() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { isAdminOrManager, isLoading: adminLoading } = useAdmin(user?.id);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        try {
          const profileData = await getProfile(user.id);
          setProfile(profileData);
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

  const initials = user.email
    ? user.email
        .split("@")[0]
        .split(".")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  const isVerified = profile?.is_verified || false;

  return (
    <div className="pt-1.5">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-9 w-9 rounded-full border-[#150aec] border"
            aria-label="User menu"
          >
            <Avatar className="h-9 w-9">
              <AvatarImage
                src={
                  getMediaUrl(profile?.profile_photo) ||
                  (user.user_metadata?.avatar_url as string)
                }
                alt={user.email || ""}
              />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>

            {isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 border border-gray-300 shadow-sm">
                <CheckCircle className="h-3.5 w-3.5 text-blue-500 fill-blue-100" />
              </div>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium leading-none truncate w-full">
                  {profile?.full_name || user.email}
                </p>
                {isVerified && (
                  <CheckCircle className="h-3.5 w-3.5 text-blue-500 fill-blue-100 flex-shrink-0" />
                )}
              </div>
              <p className="text-xs leading-none text-muted-foreground truncate w-full">
                {user.email}
              </p>

              {isVerified && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                    ✓ Verified Account
                  </span>
                </div>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {isAdminOrManager && (
            <>
              <div className="px-2 py-1.5">
                <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                  <ShieldAlert className="h-3 w-3" />
                  <span>Admin Access</span>
                </div>
              </div>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuGroup>
            <div className="">
              <DropdownMenuItem asChild>
                <Link
                  href={
                    profile?.username
                      ? `/${profile.username}`
                      : "/dashboard/settings/profile"
                  }
                  className="cursor-pointer"
                >
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard" className="cursor-pointer">
                  Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="cursor-pointer">
                  Settings
                </Link>
              </DropdownMenuItem>
              {!isVerified && (
                <DropdownMenuItem asChild>
                  <Link
                    href="/dashboard/settings/kyc"
                    className="cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>Get Verified</span>
                      <span className="text-xs text-amber-600 font-medium">
                        Not Verified
                      </span>
                    </div>
                  </Link>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />
            </div>
          </DropdownMenuGroup>

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
            className="hover:bg-[red] focus:bg-[red] transition-colors disabled:opacity-50"
          >
            {isSigningOut ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Signing out...
              </span>
            ) : (
              "Sign Out"
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
