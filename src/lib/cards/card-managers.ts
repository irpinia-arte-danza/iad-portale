import "server-only"

import { UserRole } from "@prisma/client"

import { getAuthUsersByIds } from "@/lib/auth/auth-users"
import { prisma } from "@/lib/prisma"

// ─────────────────────────────────────────────────────────────────────────
// I referenti tessere attivi, con lo stato dell'accesso. Senza controllo di
// ruolo: lo chiamano solo le query admin (Impostazioni › Admin e
// /admin/tessere), che hanno requireAdmin come prima istruzione.
// Un referente revocato (utente disattivato) non compare più.
// ─────────────────────────────────────────────────────────────────────────

export type CardManagerRow = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  // Invitato: link mandato, password non ancora scelta. Attivo: è entrato.
  access: "INVITED" | "ACTIVE"
  invitedAt: Date
  lastSignInAt: Date | null
}

export async function cardManagersData(): Promise<CardManagerRow[]> {
  const users = await prisma.user.findMany({
    where: { role: UserRole.CARD_MANAGER, isActive: true, deletedAt: null },
    select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  })
  if (users.length === 0) return []
  const auth = await getAuthUsersByIds(users.map((u) => u.id))
  return users.map((u) => {
    const info = auth.get(u.id)
    return {
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      access: info?.hasPassword ? "ACTIVE" : "INVITED",
      invitedAt: u.createdAt,
      lastSignInAt: info?.lastSignInAt ?? null,
    }
  })
}
