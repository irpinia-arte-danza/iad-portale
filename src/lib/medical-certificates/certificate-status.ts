import type { Prisma } from "@prisma/client"

import {
  classifyExpiry,
  compareByExpiry,
  compareCurrentFirst,
  daysUntilExpiry,
  EXPIRY_WARNING_DAYS,
  type ExpiryStatus,
} from "@/lib/utils/expiry-status"

// Stato del certificato medico: ricavato a ogni lettura dalla scadenza del
// certificato corrente, mai salvato in DB. Unica versione per scheda allieva,
// riepilogo certificati, promemoria, lista allieve e pagina insegnante.
//
// Il calcolo vero vive in `@/lib/utils/expiry-status`, condiviso con le
// tessere ENDAS/CSEN: qui restano solo i nomi con cui il resto del codice lo
// chiama da sempre, e l'ordinamento specifico di MedicalCertificate.
export type CertStatus = ExpiryStatus

// Entro questi giorni dalla scadenza il certificato è "In scadenza"
export const CERT_EXPIRY_WARNING_DAYS = EXPIRY_WARNING_DAYS

export { daysUntilExpiry }

export const classifyCert = classifyExpiry

// Certificato corrente = non cestinato con la scadenza più lontana; a parità
// di scadenza vale l'ultimo inserito. Le query usano lo stesso ordine.
export const CURRENT_CERTIFICATE_ORDER: Prisma.MedicalCertificateOrderByWithRelationInput[] =
  [{ expiryDate: "desc" }, { createdAt: "desc" }]

export { compareCurrentFirst }

// Ordine della lista allieve per certificato: prima chi non ce l'ha, poi per
// scadenza crescente (i certificati scaduti da più tempo in cima).
export const compareByCertificateExpiry = compareByExpiry
