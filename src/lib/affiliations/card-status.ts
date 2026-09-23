import type { Prisma } from "@prisma/client"

import {
  classifyExpiry,
  compareByExpiry,
  compareCurrentFirst,
  daysUntilExpiry,
  EXPIRY_WARNING_DAYS,
  type ExpiryStatus,
} from "@/lib/utils/expiry-status"

// La tessera dell'ente è il gemello del certificato medico: stessa soglia,
// stesso calcolo per giorno di calendario, stato mai salvato in DB. Il codice
// è quello condiviso in `@/lib/utils/expiry-status`, non una copia.
export type CardStatus = ExpiryStatus

export const CARD_EXPIRY_WARNING_DAYS = EXPIRY_WARNING_DAYS

export { daysUntilExpiry }

export const classifyCard = classifyExpiry

export const CARD_STATUS_LABELS: Record<CardStatus, string> = {
  valid: "Valida",
  expiring: "In scadenza",
  expired: "Scaduta",
  missing: "Assente",
}

// Tessera corrente = non cestinata con la scadenza più lontana; a parità di
// scadenza vale l'ultima inserita. Una tessera senza scadenza (inserita a
// mano, senza PDF) non può essere la corrente finché ce n'è una con la data.
export const CURRENT_CARD_ORDER: Prisma.AffiliationOrderByWithRelationInput[] =
  [{ expiryDate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }]

export { compareCurrentFirst }

// Ordine della lista allieve per tessera: prima chi non ce l'ha, poi per
// scadenza crescente (le scadute da più tempo in cima).
export const compareByCardExpiry = compareByExpiry

// Anno sociale ENDAS: l'anno in cui parte la stagione. La tessera "Anno
// sociale 2026" è quella dell'anno accademico 2026/2027.
export function seasonYearFromAcademicYearStart(startDate: Date): number {
  return new Date(startDate).getUTCFullYear()
}
