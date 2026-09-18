import { redirect } from "next/navigation"

import { UserRole } from "@prisma/client"

import { NO_ACCESS_ROUTE } from "./account-state"
import { getCurrentAccount } from "./current-account"
import { getDashboardPath } from "./dashboard-path"

// Allieva maggiorenne che accede per sé (corso adulti). Stessa logica di
// requireParent, ma l'area la serve per una persona sola invece che per le
// figlie di qualcuno.
export async function requireAthlete(): Promise<{
  userId: string
  athleteId: string
}> {
  const account = await getCurrentAccount()

  if (account.state === "anonymous") redirect("/login")
  if (account.state === "blocked") redirect(NO_ACCESS_ROUTE)
  if (account.role !== UserRole.ATHLETE || !account.athleteId) {
    redirect(getDashboardPath(account.role))
  }

  return { userId: account.userId, athleteId: account.athleteId }
}
