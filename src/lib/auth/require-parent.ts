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
  // Un'allieva con accesso proprio ha come dashboard questa stessa area:
  // mandarla lì sarebbe un giro infinito. Finché le query del portale
  // filtrano per genitore non la si può servire, quindi si ferma qui. Cade
  // quando la guardia imparerà a lavorare per entrambi i ruoli.
  if (account.role === UserRole.ATHLETE) redirect(NO_ACCESS_ROUTE)
  if (account.role !== UserRole.PARENT || !account.parentId) {
    redirect(getDashboardPath(account.role))
  }

  return { userId: account.userId, parentId: account.parentId }
}
