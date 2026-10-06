import {
  CERT_MISSING_TEMPLATE_SLUG,
  CERT_REMINDER_TEMPLATE_SLUG,
} from "@/lib/resend/template-usage"

import type { CertStatus } from "./certificate-status"

// ─────────────────────────────────────────────────────────────────────────
// Cosa si chiede alla famiglia, e in quante email.
//
// Prima il promemoria esisteva solo per i certificati in scadenza o scaduti:
// per quello che manca del tutto — il caso più grave e il più numeroso — il
// tasto era spento. Adesso ogni stato ha il suo testo:
// • mancante → "certificato-mancante" (non c'è una scadenza di cui parlare);
// • scaduto o in scadenza → "cert-reminder", con tipo e data;
// • valido → niente da chiedere.
//
// Di gruppo, i mancanti di una stessa famiglia stanno in **una** email con
// l'elenco delle figlie: due sorelle senza certificato non devono generare
// due messaggi a mezzo secondo di distanza. Scaduti e in scadenza restano
// uno per allieva, perché il testo riporta tipo e data di quel certificato.
// ─────────────────────────────────────────────────────────────────────────

export function certRequestTemplate(status: CertStatus): string | null {
  if (status === "missing") return CERT_MISSING_TEMPLATE_SLUG
  if (status === "expired" || status === "expiring") {
    return CERT_REMINDER_TEMPLATE_SLUG
  }
  return null
}

export type CertRequestItem = {
  athleteId: string
  // "Nome Cognome": finisce nel testo dell'email
  athleteName: string
  status: CertStatus
  // Chi riceve: il genitore, o l'allieva stessa quando non ne ha
  recipientKey: string
}

export type CertRequestEmail = {
  recipientKey: string
  templateSlug: string
  athleteIds: string[]
  athleteNames: string[]
}

export type CertRequestPlan = {
  emails: CertRequestEmail[]
  // Famiglie raggiunte: una famiglia può ricevere più di un'email solo se ha
  // sia una figlia senza certificato sia una con il certificato in scadenza
  families: number
  // Allieve col certificato valido: non c'è niente da chiedere
  nothingToAsk: string[]
}

export function planCertRequests(items: CertRequestItem[]): CertRequestPlan {
  const emails: CertRequestEmail[] = []
  const missingByRecipient = new Map<string, CertRequestEmail>()
  const nothingToAsk: string[] = []

  for (const item of items) {
    const templateSlug = certRequestTemplate(item.status)
    if (!templateSlug) {
      nothingToAsk.push(item.athleteId)
      continue
    }

    if (templateSlug === CERT_MISSING_TEMPLATE_SLUG) {
      const existing = missingByRecipient.get(item.recipientKey)
      if (existing) {
        existing.athleteIds.push(item.athleteId)
        existing.athleteNames.push(item.athleteName)
        continue
      }
      const email: CertRequestEmail = {
        recipientKey: item.recipientKey,
        templateSlug,
        athleteIds: [item.athleteId],
        athleteNames: [item.athleteName],
      }
      missingByRecipient.set(item.recipientKey, email)
      emails.push(email)
      continue
    }

    emails.push({
      recipientKey: item.recipientKey,
      templateSlug,
      athleteIds: [item.athleteId],
      athleteNames: [item.athleteName],
    })
  }

  return {
    emails,
    families: new Set(emails.map((e) => e.recipientKey)).size,
    nothingToAsk,
  }
}

// "Maria Rossi" · "Maria Rossi e Anna Rossi" · "Maria, Anna e Lia Rossi" no:
// i nomi restano interi, sono quelli che la famiglia riconosce
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ""
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`
}
