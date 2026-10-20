import { redirect } from "next/navigation"

import { UserRole } from "@prisma/client"

import { NO_ACCESS_ROUTE } from "./account-state"
import { getCurrentAccount, requirePasswordSet } from "./current-account"
import { getDashboardPath } from "./dashboard-path"
import { requireAdmin } from "./require-admin"

// ─────────────────────────────────────────────────────────────────────────
// Il referente tessere (CARD_MANAGER): stessa logica di requireTeacher.
// Senza secondo fattore e non admin per adminGate: vede /tessere e basta.
// L'admin NON passa di qui: le tessere le gestisce da /admin/tessere.
// ─────────────────────────────────────────────────────────────────────────
export async function requireCardManager(): Promise<{ userId: string }> {
  const account = await getCurrentAccount()

  if (account.state === "anonymous") redirect("/login")
  if (account.state === "blocked") redirect(NO_ACCESS_ROUTE)
  await requirePasswordSet()
  if (account.role !== UserRole.CARD_MANAGER) {
    redirect(getDashboardPath(account.role))
  }

  return { userId: account.userId }
}

// Chi può caricare tessere: l'admin (con il secondo fattore, requireAdmin)
// oppure il referente. Un solo posto per la regola, usato dalle azioni di
// caricamento che le due pagine condividono.
export async function requireCardUploader(): Promise<{
  userId: string
  role: "ADMIN" | "CARD_MANAGER"
}> {
  const account = await getCurrentAccount()
  if (account.state === "ok" && account.role === UserRole.CARD_MANAGER) {
    const { userId } = await requireCardManager()
    return { userId, role: "CARD_MANAGER" }
  }
  const { userId } = await requireAdmin()
  return { userId, role: "ADMIN" }
}
