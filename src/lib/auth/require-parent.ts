import { redirect } from "next/navigation"

import { UserRole } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"

export async function requireParent(): Promise<{
  userId: string
  parentId: string
}> {
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

  if (!user || !user.isActive || user.role !== UserRole.PARENT) {
    redirect("/login")
  }

  const parent = await prisma.parent.findFirst({
    where: { userId: authUser.id, deletedAt: null },
    select: { id: true },
  })

  if (!parent) {
    redirect("/login")
  }

  return { userId: authUser.id, parentId: parent.id }
}
