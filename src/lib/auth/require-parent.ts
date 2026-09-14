import { redirect } from "next/navigation"

import { UserRole } from "@prisma/client"

import { NO_ACCESS_ROUTE } from "./account-state"
import { getCurrentAccount } from "./current-account"
import { getDashboardPath } from "./dashboard-path"

// - non autenticato → /login
// - autenticato ma senza accesso utilizzabile → logout + pagina esplicativa
//   (mai /login: il proxy rimanderebbe alla dashboard, loop infinito)
// - autenticato con altro ruolo → la propria dashboard
export async function requireParent(): Promise<{
  userId: string
  parentId: string
}> {
  const account = await getCurrentAccount()

  if (account.state === "anonymous") redirect("/login")
  if (account.state === "blocked") redirect(NO_ACCESS_ROUTE)
  if (account.role !== UserRole.PARENT || !account.parentId) {
    redirect(getDashboardPath(account.role))
  }

  return { userId: account.userId, parentId: account.parentId }
}
