import { redirect } from "next/navigation"

import { UserRole } from "@prisma/client"

import { NO_ACCESS_ROUTE } from "./account-state"
import { getCurrentAccount } from "./current-account"
import { getDashboardPath } from "./dashboard-path"

// Stessa logica di requireParent (vedi commento lì).
export async function requireTeacher(): Promise<{
  userId: string
  teacherId: string
}> {
  const account = await getCurrentAccount()

  if (account.state === "anonymous") redirect("/login")
  if (account.state === "blocked") redirect(NO_ACCESS_ROUTE)
  if (account.role !== UserRole.TEACHER || !account.teacherId) {
    redirect(getDashboardPath(account.role))
  }

  return { userId: account.userId, teacherId: account.teacherId }
}
