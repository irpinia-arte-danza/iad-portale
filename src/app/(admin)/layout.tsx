import { redirect } from "next/navigation"
import { UserRole } from "@prisma/client"

import { createClient } from "@/lib/supabase/server"
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
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      isActive: true,
    },
  })

  if (!user || !user.isActive || user.role !== UserRole.ADMIN) {
    redirect("/login")
  }

  return (
    <SidebarProvider>
      <AdminSidebar
        firstName={user.firstName}
        lastName={user.lastName}
        email={user.email}
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
