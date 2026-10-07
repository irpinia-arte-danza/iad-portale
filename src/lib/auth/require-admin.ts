import { redirect } from "next/navigation"

import { UserRole } from "@prisma/client"

import { NO_ACCESS_ROUTE } from "./account-state"
import { getCurrentAccount } from "./current-account"
import { getDashboardPath } from "./dashboard-path"
import { getSessionLevel, hasRecoveryPass } from "./mfa"
import { adminGate, MFA_VERIFY_PATH } from "./mfa-gate"

export type AdminAccess = { userId: string }

// Primo fattore: utente attivo con ruolo ADMIN. Basta per le pagine del
// secondo fattore (/verifica-2fa, /imposta-2fa), che esistono proprio per
// chi non ha ancora completato il secondo passaggio.
export async function requireAdminFirstFactor(): Promise<AdminAccess> {
  const account = await getCurrentAccount()

  if (account.state === "anonymous") redirect("/login")
  if (account.state === "blocked") redirect(NO_ACCESS_ROUTE)
  if (account.role !== UserRole.ADMIN) {
    redirect(getDashboardPath(account.role))
  }

  return { userId: account.userId }
}

// Admin a tutti gli effetti: ruolo ADMIN E secondo fattore superato in
// questa sessione (aal2 nel JWT, oppure il lasciapassare di un codice di
// recupero). Con aal1 si va al secondo passaggio: la pagina lì decide se
// chiedere il codice o far fare l'iscrizione. La regola è adminGate
// (mfa-gate.ts), la stessa del proxy; vedi docs/gotchas.md §17.49.
export async function requireAdmin(): Promise<AdminAccess> {
  const { userId } = await requireAdminFirstFactor()

  const level = await getSessionLevel()
  const recoveryPass = await hasRecoveryPass(userId, level.sessionId)
  if (adminGate({ role: UserRole.ADMIN, aal: level.aal, recoveryPass }) !== "ok") {
    redirect(MFA_VERIFY_PATH)
  }

  return { userId }
}
