"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BarChart3, FileText, Home, Settings, Users, Shield, UserCog, ClipboardCheckIcon, DollarSign } from "lucide-react"
import { useAdmin } from "@/hooks/use-admin"
import { useAuth } from "@/hooks/use-auth"
import { Skeleton } from "@/components/ui/skeleton"

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
    title: "My Donations",
    href: "/dashboard/donations",
    icon: Users,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
]

// Admin-specific nav items
const adminNavItems = [
  {
    title: "Manage Causes",
    href: "/dashboard/admin/causes",
    icon: FileText,
  },
  {
    title: "Manage Users",
    href: "/dashboard/admin/users",
    icon: UserCog,
  },
  {
    title: "Matching Pools",
    href: "/dashboard/admin/matching-pools",
    icon: DollarSign,
  },
  {
    title: "Analytics",
    href: "/dashboard/admin/analytics",
    icon: BarChart3,
  },
  {
    title: "Logs",
    href: "/dashboard/admin/logs",
    icon: ClipboardCheckIcon
  }
]

export function DashboardNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { isAdminOrManager, isLoading } = useAdmin(user?.id)

  if (isLoading) {
    return (
      <nav className="grid items-start gap-2 py-4">
        {userNavItems.map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
        <div className="my-2">
          {/* <div className="mb-2 px-2 text-xs font-semibold tracking-tight flex items-center">
            <Shield className="mr-1 h-3 w-3" />
            Admin
          </div> */}
          {adminNavItems.map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </nav>
    )
  }

  return (
    <nav className="grid items-start gap-2 py-4">
      {userNavItems.map((item, index) => (
        <Link key={index} href={item.href}>
          <Button
            variant={pathname === item.href ? "secondary" : "ghost"}
            className={cn("w-full justify-start", pathname === item.href ? "bg-secondary hover:bg-secondary" : "")}
          >
            <item.icon className="mr-2 h-4 w-4" />
            {item.title}
          </Button>
        </Link>
      ))}

      {!isLoading && isAdminOrManager && (
        <>
          <div className="my-2 grid items-start gap-2 ">
            <div className="mb-2 px-2 text-xs font-semibold tracking-tight flex items-center">
              <Shield className="mr-1 h-3 w-3" />
              Admin
            </div>
            {adminNavItems.map((item, index) => (
              <Link key={index} href={item.href}>
                <Button
                  variant={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    pathname === item.href || pathname.startsWith(`${item.href}/`) ? "bg-secondary hover:bg-secondary" : "",
                  )}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.title}
                </Button>
              </Link>
            ))}
          </div>
        </>
      )}
    </nav>
  )
}

