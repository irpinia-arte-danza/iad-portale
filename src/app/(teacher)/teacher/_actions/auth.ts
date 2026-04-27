"use server"

import { redirect } from "next/navigation"

import { requireTeacher } from "@/lib/auth/require-teacher"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/schemas/common"
import {
  changePasswordSchema,
  type ChangePasswordValues,
} from "@/lib/schemas/admin-settings"

export async function updateTeacherPassword(
  values: ChangePasswordValues,
  next: string,
): Promise<ActionResult> {
  const { userId } = await requireTeacher()

  const parsed = changePasswordSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Password non valida",
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  })
  if (error) {
    console.error("[teacher set-password] updateUser failed", error.message)
    return { ok: false, error: error.message }
  }

  await prisma.auditLog.create({
    data: {
      userId,
      action: "CHANGE_PASSWORD",
      entityType: "User",
      entityId: userId,
    },
  })

  const safeNext = next.startsWith("/") ? next : "/teacher/dashboard"
  redirect(safeNext)
}
