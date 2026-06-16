"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Settings, CreditCard, FileText, LogOut, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Profile {
  name: string;
  email: string;
  avatar: string;
  subscription?: string;
  model?: string;
}

interface MenuItem {
  label: string;
  value?: string;
  href: string;
  icon: React.ReactNode;
  external?: boolean;
}

const SAMPLE_PROFILE_DATA: Profile = {
  name: "Eugene An",
  email: "eugene@kokonutui.com",
  avatar:
    "https://ferf1mheo22r9ira.public.blob.vercel-storage.com/profile-mjss82WnWBRO86MHHGxvJ2TVZuyrDv.jpeg",
  subscription: "PRO",
  model: "Gemini 2.0 Flash",
};

interface ProfileDropdownProps extends React.HTMLAttributes<HTMLDivElement> {
  data?: Profile;
  showTopbar?: boolean;
  onSignOut?: () => void;
  menuItems?: MenuItem[];
}

export default function ProfileDropdown({
  data = SAMPLE_PROFILE_DATA,
  className,
  onSignOut,
  menuItems: customMenuItems,
  ...props
}: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Use custom menu items if provided, otherwise use default
  const menuItems: MenuItem[] = customMenuItems || [
    {
      label: "Profile",
      href: "#",
      icon: <User className="w-4 h-4" />,
    },
    {
      label: "Subscription",
      value: data.subscription,
      href: "#",
      icon: <CreditCard className="w-4 h-4" />,
    },
    {
      label: "Settings",
      href: "#",
      icon: <Settings className="w-4 h-4" />,
    },
    {
      label: "Terms & Policies",
      href: "#",
      icon: <FileText className="w-4 h-4" />,
      external: true,
    },
  ];

  return (
    <div className={cn("relative", className)} {...props}>
      <DropdownMenu onOpenChange={setIsOpen}>
        <div className="group relative">
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 p-2 rounded-lg bg-white border border-zinc-300 hover:border-zinc-500 hover:bg-zinc-50/80 hover:shadow-sm transition-all duration-200 focus:outline-none"
            >
              <div className="text-left flex-1">
                <div className="text-sm font-medium text-zinc-900 tracking-tight leading-tight">
                  {data.name}
                </div>
                <div className="text-xs text-zinc-500 tracking-tight leading-tight">
                  {data.email}
                </div>
              </div>
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-blue-500 to-blue-400 p-0.5">
                  <div className="w-full h-full rounded-full overflow-hidden bg-white">
                    <Image
                      src={getMediaUrl(data.avatar)}
                      alt={data.name}
                      width={28}
                      height={28}
                      className="w-full h-full object-cover rounded-full"
                      unoptimized={isProxyMediaUrl(getMediaUrl(data.avatar))}
                    />
                  </div>
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>

          {/* Bending line indicator on the right */}
          <div
            className={cn(
              "absolute -right-2 top-1/2 -translate-y-1/2 transition-all duration-200",
              isOpen ? "opacity-100" : "opacity-60 group-hover:opacity-100",
            )}
          >
            <svg
              width="8"
              height="16"
              viewBox="0 0 8 16"
              fill="none"
              className={cn(
                "transition-all duration-200",
                isOpen
                  ? "text-blue-500 scale-110"
                  : "text-zinc-400 group-hover:text-zinc-600",
              )}
              aria-hidden="true"
            >
              <path
                d="M1 3C4 6 4 10 1 13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>

          <DropdownMenuContent
            align="end"
            sideOffset={4}
            className="w-48 p-1 bg-white/95 backdrop-blur-sm border border-zinc-300 rounded-lg shadow-lg shadow-zinc-900/5 
                    data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-top-right"
          >
            <div className="space-y-1">
              {menuItems.map((item) => (
                <DropdownMenuItem key={item.label} asChild>
                  <Link
                    href={item.href}
                    className="flex items-center p-2 hover:bg-zinc-100/80 rounded-md transition-all duration-200 cursor-pointer group hover:shadow-sm border border-transparent hover:border-zinc-200/50"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {item.icon}
                      <span className="text-sm font-medium text-zinc-900 tracking-tight leading-tight whitespace-nowrap group-hover:text-white transition-colors">
                        {item.label}
                      </span>
                    </div>
                    <div className="flex-shrink-0 ml-auto">
                      {item.value && (
                        <span
                          className={cn(
                            "text-xs font-medium rounded-md py-1 px-2 tracking-tight",
                            item.label === "Model"
                              ? "text-blue-600 bg-blue-50 border border-blue-500/10"
                              : "text-purple-600 bg-purple-50 border border-purple-500/10",
                          )}
                        >
                          {item.value}
                        </span>
                      )}
                    </div>
                  </Link>
                </DropdownMenuItem>
              ))}
            </div>

            <DropdownMenuSeparator className="my-2 bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />

            <DropdownMenuItem asChild>
              <button
                type="button"
                onClick={onSignOut}
                className="w-full flex items-center gap-2 p-2 duration-200 bg-red-500/10 rounded-md hover:bg-red-500/20 cursor-pointer border border-transparent hover:border-red-500/30 hover:shadow-sm hover:bg-white transition-all group"
              >
                <LogOut className="w-4 h-4 text-red-500 group-hover:text-red-600 " />
                <span className="text-sm font-medium text-red-500 group-hover:text-red-600 ">
                  Sign Out
                </span>
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </div>
      </DropdownMenu>
    </div>
  );
}
