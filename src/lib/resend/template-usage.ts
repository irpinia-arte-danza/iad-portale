import type { EmailCategory } from "@prisma/client"

// ─────────────────────────────────────────────────────────────────────────
// Dove viene usato ogni testo delle email.
//
// Nella pagina "Testi delle email" ogni modello portava un pallino "Attivo",
// che non rispondeva alla domanda vera: questo testo, quando parte? Qui la
// risposta è ricavata dagli stessi nomi che usa chi invia — gli slug sono
// definiti in questo file e importati da chi fa l'invio, e la scelta per
// categoria è la stessa lista che usa il dialog "Sollecita" — così se un
// invio smette di usare un modello l'etichetta cambia insieme al codice.
// ─────────────────────────────────────────────────────────────────────────

// Slug dei modelli inviati da un punto preciso del portale
export const STAGE_INVITE_TEMPLATE_SLUG = "stage-invite"
export const CERT_REMINDER_TEMPLATE_SLUG = "cert-reminder"
export const RECEIPT_EMAIL_TEMPLATE_SLUG = "ricevuta-emessa"
export const ACCESS_TEMPLATE_SLUG = "accesso-portale"
export const PASSWORD_RESET_TEMPLATE_SLUG = "recupero-password"

// In Scadenze il modello non è fisso: "Sollecita" fa scegliere fra tutti
// quelli attivi di queste categorie
export const REMINDER_TEMPLATE_CATEGORIES: EmailCategory[] = [
  "SOLLECITO",
  "PROMEMORIA",
]

const USAGE_BY_SLUG: Record<string, string> = {
  [STAGE_INVITE_TEMPLATE_SLUG]: "Stage › Invita allieve",
  [CERT_REMINDER_TEMPLATE_SLUG]: "Certificati › Invia promemoria",
  [RECEIPT_EMAIL_TEMPLATE_SLUG]: "Ricevute › Consegna",
  [ACCESS_TEMPLATE_SLUG]: "Genitori e Insegnanti › Invia accesso",
  [PASSWORD_RESET_TEMPLATE_SLUG]: "Pagina «Password dimenticata»",
}

/**
 * Da dove parte questo modello, o null se nessun invio lo usa (succede: un
 * modello può restare in archivio senza essere collegato a niente, e dirlo
 * evita di correggere un testo che nessuno riceverà).
 */
export function templateUsage(template: {
  slug: string
  category: EmailCategory
}): string | null {
  const bySlug = USAGE_BY_SLUG[template.slug]
  if (bySlug) return bySlug
  if (REMINDER_TEMPLATE_CATEGORIES.includes(template.category)) {
    return "Scadenze › Sollecita"
  }
  return null
}
