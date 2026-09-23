import { matchAthlete, type MatchCandidate } from "./name-match"
import type { CardEntity, CardParseResult, ParsedCard } from "./parsers"

// Cosa succede a ogni file del lotto. Il piano è puro e ricalcolabile: il
// server lo usa per costruire l'anteprima, il browser lo rifà da capo ogni
// volta che Giuseppina abbina a mano una riga, senza tornare al server.

export type CardImportOutcome =
  // Pronta da salvare
  | { kind: "ready"; athleteId: string }
  // Nessuna allieva con quel nome e quella data di nascita
  | { kind: "not_found" }
  // Più di un'allieva: omonime con la stessa data di nascita, o nome
  // illeggibile e scelta ancora da fare
  | { kind: "ambiguous"; athleteIds: string[] }
  // Quell'allieva ha già una tessera di quell'anno
  | { kind: "already_present"; athleteId: string; sameNumber: boolean }
  // Quel numero di tessera è già in archivio o è già in questo lotto
  | { kind: "duplicate_number"; inBatch: boolean }
  // Non è una tessera dell'ente, o mancano i dati della tessera
  | { kind: "discarded"; reason: "OTHER_ENTITY" | "UNREADABLE"; missing: string[] }

export type CardImportRow = {
  // Identifica il file dentro il lotto: il nome può ripetersi, l'indice no
  index: number
  fileName: string
  card: ParsedCard | null
  outcome: CardImportOutcome
}

export type ExistingCard = {
  athleteId: string
  entity: CardEntity
  cardYear: number
  cardNumber: string | null
}

export type ImportPlanInput = {
  files: { index: number; fileName: string; parsed: CardParseResult }[]
  athletes: MatchCandidate[]
  existingCards: ExistingCard[]
  // Abbinamenti fatti a mano: indice del file → id allieva
  overrides?: Record<number, string>
}

function yearKey(athleteId: string, entity: CardEntity, year: number): string {
  return `${athleteId}|${entity}|${year}`
}

function numberKey(entity: CardEntity, cardNumber: string): string {
  return `${entity}|${cardNumber}`
}

export function buildImportPlan(input: ImportPlanInput): CardImportRow[] {
  const { files, athletes, existingCards, overrides = {} } = input

  const existingByYear = new Map<string, ExistingCard>()
  const existingNumbers = new Set<string>()
  for (const card of existingCards) {
    existingByYear.set(
      yearKey(card.athleteId, card.entity, card.cardYear),
      card,
    )
    if (card.cardNumber) {
      existingNumbers.add(numberKey(card.entity, card.cardNumber))
    }
  }

  // Quello che le righe precedenti dello stesso lotto hanno già prenotato:
  // vince il primo file, gli altri sono duplicati
  const claimedYears = new Set<string>()
  const claimedNumbers = new Set<string>()

  return files.map(({ index, fileName, parsed }): CardImportRow => {
    if (!parsed.ok) {
      return {
        index,
        fileName,
        card: null,
        outcome: {
          kind: "discarded",
          reason: parsed.reason,
          missing: parsed.reason === "UNREADABLE" ? parsed.missing : [],
        },
      }
    }

    const card = parsed.card
    const nKey = numberKey(card.entity, card.cardNumber)

    if (existingNumbers.has(nKey)) {
      return {
        index,
        fileName,
        card,
        outcome: { kind: "duplicate_number", inBatch: false },
      }
    }
    if (claimedNumbers.has(nKey)) {
      return {
        index,
        fileName,
        card,
        outcome: { kind: "duplicate_number", inBatch: true },
      }
    }

    const override = overrides[index]
    const match = override
      ? ({ status: "matched", athleteId: override } as const)
      : card.person
        ? matchAthlete(card.person, athletes)
        : ({ status: "not_found" } as const)

    if (match.status === "not_found") {
      return { index, fileName, card, outcome: { kind: "not_found" } }
    }
    if (match.status === "ambiguous") {
      return {
        index,
        fileName,
        card,
        outcome: { kind: "ambiguous", athleteIds: match.athleteIds },
      }
    }

    const yKey = yearKey(match.athleteId, card.entity, card.cardYear)
    const existing = existingByYear.get(yKey)
    if (existing) {
      return {
        index,
        fileName,
        card,
        outcome: {
          kind: "already_present",
          athleteId: match.athleteId,
          sameNumber: existing.cardNumber === card.cardNumber,
        },
      }
    }
    if (claimedYears.has(yKey)) {
      return {
        index,
        fileName,
        card,
        outcome: { kind: "duplicate_number", inBatch: true },
      }
    }

    claimedYears.add(yKey)
    claimedNumbers.add(nKey)
    return {
      index,
      fileName,
      card,
      outcome: { kind: "ready", athleteId: match.athleteId },
    }
  })
}

export function readyRows(rows: CardImportRow[]): CardImportRow[] {
  return rows.filter((r) => r.outcome.kind === "ready")
}
