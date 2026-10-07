import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { NO_ACCESS_ROUTE } from "@/lib/auth/account-state"
import { previousSuccessfulLogin } from "@/lib/auth/admin-logins"
import { getSessionLevel } from "@/lib/auth/mfa"
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
import { AdminSearch } from "./_components/admin-search"
import { AdminSidebar } from "./_components/admin-sidebar"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await requireAdmin()
  // Già letto da requireAdmin nella stessa richiesta: qui serve il session_id
  const level = await getSessionLevel()

  const [cookieStore, user, brand, currentYear, counters, lastAccess] = await Promise.all([
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
    // L'accesso riuscito prima di questo: un orario che l'admin non
    // riconosce si nota subito, nel footer
    previousSuccessfulLogin(userId, level.sessionId),
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
        lastAccess={lastAccess}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 lg:h-14">
          <AdminMenuButton />
          <SidebarTrigger className="hidden lg:flex" />
          {/* Al posto del titolo: su una barra da 500 px "IAD Portale —
              Admin" diceva a Giuseppina una cosa che sapeva già */}
          <AdminSearch />
          <div className="ml-auto">
            <AcademicYearChip label={currentYear?.label ?? null} />
          </div>
        </header>
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
