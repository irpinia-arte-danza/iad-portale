import { redirect } from "next/navigation"

import { NO_ACCESS_ROUTE } from "@/lib/auth/account-state"
import { requireAdmin } from "@/lib/auth/require-admin"
import { prisma } from "@/lib/prisma"
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"

import { AdminSidebar } from "./_components/admin-sidebar"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await requireAdmin()

  const [user, brand] = await Promise.all([
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
  ])

  if (!user) {
    redirect(NO_ACCESS_ROUTE)
  }

  return (
    <SidebarProvider>
      <AdminSidebar
        firstName={user.firstName}
        lastName={user.lastName}
        email={user.email}
        brand={{
          logoUrl: brand?.logoUrl ?? null,
          logoDarkUrl: brand?.logoDarkUrl ?? null,
          asdName: brand?.asdName ?? null,
        }}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <span className="text-sm font-medium">IAD Portale — Admin</span>
        </header>
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
