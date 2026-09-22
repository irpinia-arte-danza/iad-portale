// Solo import di tipo da @prisma/client: questo modulo gira anche nel
// browser, per l'anteprima dal vivo delle impostazioni, e trascinarsi
// dietro il client Prisma nel bundle lo romperebbe.
import type { ReceiptCategory } from "@prisma/client"

// "2025-2026" → "2025-26"
export function compactAcademicYear(label: string): string {
  const parts = label.split("-")
  if (parts.length !== 2) return label
  const [start, end] = parts
  return `${start}-${end.slice(-2)}`
}

// Saggio e costumi hanno una numerazione distinta dal suffisso
export function receiptCategorySuffix(category: ReceiptCategory): string {
  if (category === "SHOWCASE") return "/S"
  if (category === "COSTUME") return "/C"
  return ""
}

// ─────────────────────────────────────────────────────────────────────────
// Formato del numero di ricevuta, a scelte chiuse.
//
// Tutto si legge dalla data di EMISSIONE, mai da quella del pagamento: una
// ricevuta appartiene a quando viene emessa. Se il 3 gennaio si emette la
// ricevuta di un bonifico del 30 dicembre, quella ricevuta è del 2027 —
// e l'etichetta dell'anno e il contatore devono leggere la stessa data,
// altrimenti il numero dice un anno e il progressivo ne conta un altro.
//
// Funzioni pure: le usano l'emissione, l'anteprima del PDF e l'anteprima
// dal vivo nelle impostazioni, che deve mostrare lo stesso risultato.
// ─────────────────────────────────────────────────────────────────────────

export type ReceiptYearMode = "NONE" | "CALENDAR" | "ACADEMIC"
export type ReceiptResetMode = "NEVER" | "CALENDAR" | "ACADEMIC"

export type ReceiptNumberingConfig = {
  prefix: string
  yearMode: ReceiptYearMode
  resetMode: ReceiptResetMode
  digits: number
}

// Periodo unico quando il progressivo non riparte mai: così il confronto
// nell'assegnazione atomica è sempre soddisfatto e il contatore incrementa.
export const NO_PERIOD_KEY = "ALL"

// Segmento dell'anno dentro il numero; null = nessun segmento.
// academicYearLabel è l'anno accademico che contiene la data di emissione:
// se non ce n'è uno, il segmento sparisce invece di inventare un'etichetta.
export function yearSegment(
  config: Pick<ReceiptNumberingConfig, "yearMode">,
  issueDate: Date,
  academicYearLabel: string | null,
): string | null {
  if (config.yearMode === "NONE") return null
  if (config.yearMode === "CALENDAR") return String(issueDate.getUTCFullYear())
  return academicYearLabel ? compactAcademicYear(academicYearLabel) : null
}

// Chiave del periodo del contatore. Senza anno accademico che contenga la
// data, il riavvio accademico si comporta come "mai": meglio una serie che
// prosegue di una che riparte su un presupposto mancante.
export function periodKey(
  config: Pick<ReceiptNumberingConfig, "resetMode">,
  issueDate: Date,
  academicYearLabel: string | null,
): string {
  if (config.resetMode === "NEVER") return NO_PERIOD_KEY
  if (config.resetMode === "CALENDAR") return String(issueDate.getUTCFullYear())
  return academicYearLabel ?? NO_PERIOD_KEY
}

export function formatReceiptNumber(params: {
  config: ReceiptNumberingConfig
  issueDate: Date
  academicYearLabel: string | null
  sequence: number
  category: ReceiptCategory
}): string {
  const year = yearSegment(params.config, params.issueDate, params.academicYearLabel)
  const progressive = String(params.sequence).padStart(params.config.digits, "0")
  const suffix = receiptCategorySuffix(params.category)
  return year
    ? `${params.config.prefix}${year}/${progressive}${suffix}`
    : `${params.config.prefix}${progressive}${suffix}`
}

// Candidato dal contatore: prosegue se il periodo è lo stesso, riparte da 1
// se è cambiato. È la stessa condizione della UPDATE atomica in emissione.
export function counterCandidate(
  counter: { period: string | null; number: number },
  currentPeriod: string,
): number {
  return counter.period === currentPeriod ? counter.number + 1 : 1
}

// Progressivo da assegnare: il candidato, mai sotto un numero già emesso
// nello stesso periodo. È la rete che impedisce i duplicati quando il
// contatore e le ricevute non sono d'accordo — per esempio subito dopo un
// cambio di configurazione, dove il contatore riparte ma nel periodo
// corrente ci sono già ricevute emesse col formato vecchio.
export function nextReceiptSequence(
  candidate: number,
  maxInPeriod: number,
): number {
  return candidate > maxInPeriod ? candidate : maxInPeriod + 1
}
