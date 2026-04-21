"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpen,
  FileSpreadsheet,
  FolderArchive,
  GraduationCap,
  Home,
  Receipt,
  Settings,
  TrendingUp,
  UserCog,
  Users,
  Wallet,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { LogoutButton } from "@/components/auth/logout-button"
import { ThemeToggle } from "@/components/theme-toggle"

type AdminSidebarProps = {
  firstName: string | null
  lastName: string | null
  email: string
}

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: Home, exact: true },
  { href: "/admin/athletes", label: "Allieve", icon: GraduationCap },
  { href: "/admin/parents", label: "Genitori", icon: Users },
  { href: "/admin/teachers", label: "Insegnanti", icon: UserCog },
  { href: "/admin/courses", label: "Corsi", icon: BookOpen },
  { href: "/admin/payments", label: "Pagamenti", icon: Receipt },
  { href: "/admin/expenses", label: "Spese", icon: Wallet },
  {
    href: "/admin/reports/corrispettivi",
    label: "Corrispettivi",
    icon: FileSpreadsheet,
  },
  {
    href: "/admin/reports/bilancio",
    label: "Bilancio",
    icon: TrendingUp,
  },
  {
    href: "/admin/reports/annuale",
    label: "Export annuale",
    icon: FolderArchive,
  },
  { href: "/admin/settings", label: "Impostazioni", icon: Settings },
] as const

export function AdminSidebar({
  firstName,
  lastName,
  email,
}: AdminSidebarProps) {
  const pathname = usePathname()
  const displayName =
    [firstName, lastName].filter(Boolean).join(" ") || "Admin"

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex flex-col gap-0.5 px-2 py-1">
          <span className="text-sm font-semibold">IAD Portale</span>
          <span className="truncate text-xs text-muted-foreground">
            {displayName}
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive =
                  "exact" in item && item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href)
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex flex-col gap-0.5 px-2 py-1 text-xs">
          <span className="truncate font-medium">{displayName}</span>
          <span className="truncate text-muted-foreground">{email}</span>
        </div>
        <div className="flex items-center justify-between gap-2 px-2 py-1">
          <LogoutButton />
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
