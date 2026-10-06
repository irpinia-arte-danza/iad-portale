import { z } from "zod"

import { endOfToday } from "./common"

// ─────────────────────────────────────────────────────────────────────────
// I consensi cartacei che la segreteria registra sulla scheda allieva.
//
// Tre, e non i cinque del modulo di iscrizione: sono quelli che hanno un
// effetto operativo nel portale — senza informativa privacy firmata i dati
// non si dovrebbero trattare (passo «Privacy» in «Da completare»), e le
// due liberatorie decidono dove possono finire foto e video. Gli altri
// (regolamento, recesso, pagamenti) restano sul modulo di carta.
// ─────────────────────────────────────────────────────────────────────────

export const CONSENT_KINDS = [
  "GDPR",
  "IMAGE_RELEASE_INTERNAL",
  "IMAGE_RELEASE_PUBLIC",
] as const

export type ConsentKind = (typeof CONSENT_KINDS)[number]

export const CONSENT_KIND_LABELS: Record<ConsentKind, string> = {
  GDPR: "Informativa privacy",
  IMAGE_RELEASE_INTERNAL: "Foto e video per uso interno",
  IMAGE_RELEASE_PUBLIC: "Foto e video su sito e social",
}

export const CONSENT_KIND_DESCRIPTIONS: Record<ConsentKind, string> = {
  GDPR: "Firma dell'informativa sul trattamento dei dati personali.",
  IMAGE_RELEASE_INTERNAL:
    "Archivio dell'associazione, saggio, chat del corso: non si pubblica.",
  IMAGE_RELEASE_PUBLIC: "Pubblicazione su sito e canali social.",
}

export function isConsentKind(value: string): value is ConsentKind {
  return (CONSENT_KINDS as readonly string[]).includes(value)
}

// Chi ha firmato: un genitore collegato (il suo id) oppure l'allieva stessa,
// se maggiorenne
export const SIGNED_BY_ATHLETE = "athlete"

// Un modulo firmato copre spesso più consensi (privacy + liberatorie) e più
// sorelle: una registrazione sola, con lo stesso file su tutte le righe
export const consentSchema = z.object({
  kinds: z
    .array(z.enum(CONSENT_KINDS, { message: "Tipo di consenso non valido" }))
    .min(1, { message: "Scegli almeno un consenso" }),
  signedOn: z
    .date({ message: "Data non valida" })
    .max(endOfToday(), { message: "La firma non può essere nel futuro" }),
  signedBy: z.string().trim().min(1, { message: "Indica chi ha firmato" }),
  // Sorelle (id allieva) a cui registrare lo stesso modulo
  alsoFor: z.array(z.string().uuid()).max(10),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
})

export type ConsentValues = z.infer<typeof consentSchema>
