import { redirect } from "next/navigation"
import { UserRole } from "@prisma/client"

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { LogoutButton } from "@/components/auth/logout-button"

import { TeacherTabbar } from "./_components/teacher-tabbar"

export default async function TeacherLayout({
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
    select: { isActive: true, role: true },
  })

  if (!user || !user.isActive || user.role !== UserRole.TEACHER) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b bg-card px-4">
        <span className="text-sm font-semibold">IAD Portale</span>
        <LogoutButton />
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-20">
        {children}
      </main>

      <TeacherTabbar />
    </div>
  )
}
