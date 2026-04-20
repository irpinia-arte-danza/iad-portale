import { redirect } from "next/navigation"

import { UserRole } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"

export async function requireAdmin(): Promise<{ userId: string }> {
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

  if (!user || !user.isActive || user.role !== UserRole.ADMIN) {
    redirect("/login")
  }

  return { userId: authUser.id }
}
