"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home } from "lucide-react"

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

type AdminSidebarProps = {
  firstName: string | null
  lastName: string | null
  email: string
}

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
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/admin/dashboard"}
                  tooltip="Dashboard"
                >
                  <Link href="/admin/dashboard">
                    <Home />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex flex-col gap-0.5 px-2 py-1 text-xs">
          <span className="truncate font-medium">{displayName}</span>
          <span className="truncate text-muted-foreground">{email}</span>
        </div>
        <div className="px-2 py-1">
          <LogoutButton />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
