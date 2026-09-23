// Lettura del PDF della tessera, separata per ente.
//
// Ogni ente genera il suo PDF con un suo tracciato. Il resto del sistema
// (abbinamento, anteprima, salvataggio) lavora su `ParsedCard` e non sa da
// che ente arriva: aggiungere CSEN vuol dire scrivere un altro parser e
// registrarlo, non toccare nulla di quanto c'è già.

// Gli stessi valori dell'enum Prisma AffiliationEntity, ripetuti come union
// di stringhe per tenere i parser utilizzabili anche lato client.
export type CardEntity = "ENDAS" | "CSEN"

// L'intestatario letto dal PDF. Può mancare: il tracciato dell'ente cambia
// senza preavviso e il testo estratto non sempre tiene insieme la riga dei
// dati. Se manca, la tessera resta valida e si abbina a mano — meglio di un
// file scartato.
export type ParsedCardPerson = {
  // Nome come scritto sul PDF, per la riga di anteprima
  name: string
  // Nome normalizzato in token, per l'abbinamento
  tokens: string[]
  dateOfBirth: Date
  gender: "F" | "M" | null
}

export type ParsedCard = {
  entity: CardEntity
  cardNumber: string
  // "Plus" e simili: quello che l'ente scrive accanto al numero
  cardType: string | null
  // Anno sociale (2026 = stagione 2026/2027)
  cardYear: number
  issueDate: Date
  expiryDate: Date
  person: ParsedCardPerson | null
}

// Perché un file è stato scartato:
// - OTHER_ENTITY: è un PDF, ma non è una tessera di questo ente
// - UNREADABLE: è la tessera giusta ma mancano dati (`missing` dice quali)
export type CardParseFailure =
  | { ok: false; reason: "OTHER_ENTITY" }
  | { ok: false; reason: "UNREADABLE"; missing: string[] }

export type CardParseResult = { ok: true; card: ParsedCard } | CardParseFailure

export type CardParser = {
  entity: CardEntity
  label: string
  parse(text: string): CardParseResult
}

// Spazi, a capo e spazi unificatori del PDF ridotti a un singolo spazio: il
// testo estratto da un PDF non ha una formattazione su cui contare.
export function normalizeSpaces(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

// Data italiana gg/mm/aaaa → data "solo giorno" in UTC, come le colonne
// @db.Date. Rifiuta le date che non esistono (31/02) invece di traslarle.
export function parseItalianDate(value: string): Date | null {
  const match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(value.trim())
  if (!match) return null
  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return date
}

export const DATE_PATTERN = /\d{1,2}[/.-]\d{1,2}[/.-]\d{4}/
