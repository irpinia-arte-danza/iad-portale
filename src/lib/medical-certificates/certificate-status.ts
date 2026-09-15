import type { Prisma } from "@prisma/client"

import { toDateOnly, todayDateOnly } from "@/lib/utils/date-only"

// Stato del certificato medico: ricavato a ogni lettura dalla scadenza del
// certificato corrente, mai salvato in DB. Unica versione per scheda allieva,
// riepilogo certificati, promemoria, lista allieve e pagina insegnante.
export type CertStatus = "missing" | "expired" | "expiring" | "valid"

// Entro questi giorni dalla scadenza il certificato è "In scadenza"
export const CERT_EXPIRY_WARNING_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

// Giorni di calendario (Europe/Rome) da oggi alla scadenza: 0 = scade oggi,
// negativo = già scaduto. Confronta giorni e non istanti, così un certificato
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

export function classifyCert(
  expiryDate: Date | null | undefined,
  today: Date = todayDateOnly(),
): CertStatus {
  if (!expiryDate) return "missing"
  const days = daysUntilExpiry(expiryDate, today)
  if (days < 0) return "expired"
  if (days <= CERT_EXPIRY_WARNING_DAYS) return "expiring"
  return "valid"
}

// Certificato corrente = non cestinato con la scadenza più lontana; a parità
// di scadenza vale l'ultimo inserito. Le query usano lo stesso ordine.
export const CURRENT_CERTIFICATE_ORDER: Prisma.MedicalCertificateOrderByWithRelationInput[] =
  [{ expiryDate: "desc" }, { createdAt: "desc" }]

export function compareCurrentFirst(
  a: { expiryDate: Date; createdAt: Date },
  b: { expiryDate: Date; createdAt: Date },
): number {
  const byExpiry =
    new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime()
  if (byExpiry !== 0) return byExpiry
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
}

// Ordine della lista allieve per certificato: prima chi non ce l'ha, poi per
// scadenza crescente (i certificati scaduti da più tempo in cima).
export function compareByCertificateExpiry(
  a: Date | null,
  b: Date | null,
): number {
  if (!a && !b) return 0
  if (!a) return -1
  if (!b) return 1
  return new Date(a).getTime() - new Date(b).getTime()
}
