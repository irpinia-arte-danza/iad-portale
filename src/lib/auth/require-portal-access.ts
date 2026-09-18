import { redirect } from "next/navigation"

import { NO_ACCESS_ROUTE } from "./account-state"
import { getCurrentAccount } from "./current-account"
import { getDashboardPath } from "./dashboard-path"
import { portalScopeOf, type PortalScope } from "./portal-scope"

export type PortalAccess = {
  userId: string
  scope: PortalScope
}

// Guardia dell'area riservata (/parent). Serve chi ha un ambito: un genitore
// per le figlie collegate, un'allieva maggiorenne per sé stessa. Il nome non
// parla di parentela perché la parentela non è più la condizione.
//
// - non autenticato → /login
// - autenticato ma senza accesso utilizzabile → logout + pagina esplicativa
//   (mai /login: il proxy rimanderebbe alla dashboard, loop infinito)
// - autenticato con altro ruolo → la propria dashboard
export async function requirePortalAccess(): Promise<PortalAccess> {
  const account = await getCurrentAccount()

  if (account.state === "anonymous") redirect("/login")
  if (account.state === "blocked") redirect(NO_ACCESS_ROUTE)

  const scope = portalScopeOf(account)
  if (!scope) redirect(getDashboardPath(account.role))

  return { userId: account.userId, scope }
}
