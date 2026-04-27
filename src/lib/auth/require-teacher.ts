import { redirect } from "next/navigation"

import { UserRole } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"

export async function requireTeacher(): Promise<{
  userId: string
  teacherId: string
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

  if (!user || !user.isActive || user.role !== UserRole.TEACHER) {
    redirect("/login")
  }

  const teacher = await prisma.teacher.findFirst({
    where: { userId: authUser.id, deletedAt: null },
    select: { id: true },
  })

  if (!teacher) {
    redirect("/login")
  }

  return { userId: authUser.id, teacherId: teacher.id }
}
