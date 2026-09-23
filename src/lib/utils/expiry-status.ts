import { toDateOnly, todayDateOnly } from "@/lib/utils/date-only"

// Stato di un documento con scadenza: ricavato a ogni lettura, mai salvato in
// DB. Nato per i certificati medici, condiviso con le tessere ENDAS/CSEN —
// che sono il loro gemello: stessa soglia, stesso calcolo per giorno di
// calendario a Europe/Rome.
export type ExpiryStatus = "missing" | "expired" | "expiring" | "valid"

// Entro questi giorni dalla scadenza il documento è "In scadenza"
export const EXPIRY_WARNING_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

// Giorni di calendario (Europe/Rome) da oggi alla scadenza: 0 = scade oggi,
// negativo = già scaduto. Confronta giorni e non istanti, così un documento
// che scade oggi vale fino a fine giornata.
export function daysUntilExpiry(
  expiryDate: Date,
  today: Date = todayDateOnly(),
): number {
  return Math.round(
    (toDateOnly(new Date(expiryDate)).getTime() - toDateOnly(today).getTime()) /
      DAY_MS,
  )
}

export function classifyExpiry(
  expiryDate: Date | null | undefined,
  today: Date = todayDateOnly(),
): ExpiryStatus {
  if (!expiryDate) return "missing"
  const days = daysUntilExpiry(expiryDate, today)
  if (days < 0) return "expired"
  if (days <= EXPIRY_WARNING_DAYS) return "expiring"
  return "valid"
}

// Documento corrente = quello con la scadenza più lontana; a parità di
// scadenza vale l'ultimo inserito. Le query usano lo stesso ordine.
export function compareCurrentFirst(
  a: { expiryDate: Date; createdAt: Date },
  b: { expiryDate: Date; createdAt: Date },
): number {
  const byExpiry =
    new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime()
  if (byExpiry !== 0) return byExpiry
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
}

// Ordine di una lista per scadenza: prima chi non ha il documento, poi per
// scadenza crescente (i più scaduti in cima).
export function compareByExpiry(a: Date | null, b: Date | null): number {
  if (!a && !b) return 0
  if (!a) return -1
  if (!b) return 1
  return new Date(a).getTime() - new Date(b).getTime()
}
