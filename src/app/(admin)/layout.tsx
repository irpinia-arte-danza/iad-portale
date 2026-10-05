import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { NO_ACCESS_ROUTE } from "@/lib/auth/account-state"
import { requireAdmin } from "@/lib/auth/require-admin"
import { prisma } from "@/lib/prisma"
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"

import { getNavCounters } from "./admin/dashboard/queries"

import { AcademicYearChip } from "./_components/academic-year-chip"
import { AdminMenuButton } from "./_components/admin-menu-button"
import { AdminSidebar } from "./_components/admin-sidebar"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await requireAdmin()

  const [cookieStore, user, brand, currentYear, counters] = await Promise.all([
    cookies(),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
      },
    }),
    prisma.brandSettings.findUnique({
      where: { id: 1 },
      select: {
        logoUrl: true,
        logoDarkUrl: true,
        asdName: true,
      },
    }),
    prisma.academicYear.findFirst({
      where: { isCurrent: true },
      select: { label: true },
    }),
    // Lavoro in sospeso accanto alle voci: si ricalcola a ogni navigazione,
    // perché il menu è l'unico posto sempre a portata di mano
    getNavCounters(),
  ])

  // SidebarProvider scrive già il cookie quando la sidebar si apre o si
  // chiude: leggerlo qui fa sì che Giuseppina la ritrovi come l'ha lasciata
  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false"

  if (!user) {
    redirect(NO_ACCESS_ROUTE)
  }

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <AdminSidebar
        firstName={user.firstName}
        lastName={user.lastName}
        email={user.email}
        brand={{
          logoUrl: brand?.logoUrl ?? null,
          logoDarkUrl: brand?.logoDarkUrl ?? null,
          asdName: brand?.asdName ?? null,
        }}
        counters={counters}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 lg:h-14">
          <AdminMenuButton />
          <SidebarTrigger className="hidden lg:flex" />
          <span className="truncate text-sm font-medium">
            IAD Portale — Admin
          </span>
          <div className="ml-auto">
            <AcademicYearChip label={currentYear?.label ?? null} />
          </div>
        </header>
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
