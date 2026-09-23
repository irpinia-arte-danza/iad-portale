import { describe, expect, it } from "vitest"

import { buildImportPlan, readyRows, type ExistingCard } from "./import-plan"
import type { MatchCandidate } from "./name-match"
import type { CardParseResult, ParsedCard } from "./parsers"

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

const GIULIA: MatchCandidate = {
  id: "giulia",
  firstName: "Giulia",
  lastName: "Esposito",
  dateOfBirth: d("2010-05-12"),
}

const SOFIA: MatchCandidate = {
  id: "sofia",
  firstName: "Sofia",
  lastName: "Russo",
  dateOfBirth: d("2011-03-01"),
}

function card(overrides: Partial<ParsedCard> = {}): ParsedCard {
  return {
    entity: "ENDAS",
    cardNumber: "1293190",
    cardType: "Plus",
    cardYear: 2026,
    issueDate: d("2026-09-14"),
    expiryDate: d("2027-09-13"),
    person: {
      name: "GIULIA ESPOSITO",
      tokens: ["GIULIA", "ESPOSITO"],
      dateOfBirth: d("2010-05-12"),
      gender: "F",
    },
    ...overrides,
  }
}

function file(index: number, parsed: CardParseResult, fileName?: string) {
  return {
    index,
    fileName: fileName ?? `Tessera_2026_N_${index}.pdf`,
    parsed,
  }
}

const ATHLETES = [GIULIA, SOFIA]

describe("buildImportPlan", () => {
  it("abbina la tessera all'allieva e la dà per pronta", () => {
    const rows = buildImportPlan({
      files: [file(0, { ok: true, card: card() })],
      athletes: ATHLETES,
      existingCards: [],
    })

    expect(rows[0].outcome).toEqual({ kind: "ready", athleteId: "giulia" })
    expect(readyRows(rows)).toHaveLength(1)
  })

  it("scarta il PDF che non è una tessera dell'ente", () => {
    const rows = buildImportPlan({
      files: [file(0, { ok: false, reason: "OTHER_ENTITY" })],
      athletes: ATHLETES,
      existingCards: [],
    })

    expect(rows[0].outcome).toEqual({
      kind: "discarded",
      reason: "OTHER_ENTITY",
      missing: [],
    })
    expect(rows[0].card).toBeNull()
  })

  it("scarta la tessera illeggibile dicendo cosa manca", () => {
    const rows = buildImportPlan({
      files: [
        file(0, {
          ok: false,
          reason: "UNREADABLE",
          missing: ["data scadenza"],
        }),
      ],
      athletes: ATHLETES,
      existingCards: [],
    })

    expect(rows[0].outcome).toEqual({
      kind: "discarded",
      reason: "UNREADABLE",
      missing: ["data scadenza"],
    })
  })

  it("lascia da abbinare la tessera di una sconosciuta", () => {
    const rows = buildImportPlan({
      files: [
        file(0, {
          ok: true,
          card: card({
            person: {
              name: "CHIARA BIANCHI",
              tokens: ["CHIARA", "BIANCHI"],
              dateOfBirth: d("2009-07-07"),
              gender: "F",
            },
          }),
        }),
      ],
      athletes: ATHLETES,
      existingCards: [],
    })

    expect(rows[0].outcome).toEqual({ kind: "not_found" })
  })

  it("lascia da abbinare la tessera senza intestataria leggibile", () => {
    const rows = buildImportPlan({
      files: [file(0, { ok: true, card: card({ person: null }) })],
      athletes: ATHLETES,
      existingCards: [],
    })

    expect(rows[0].outcome).toEqual({ kind: "not_found" })
  })

  it("accetta l'abbinamento fatto a mano", () => {
    const rows = buildImportPlan({
      files: [file(0, { ok: true, card: card({ person: null }) })],
      athletes: ATHLETES,
      existingCards: [],
      overrides: { 0: "sofia" },
    })

    expect(rows[0].outcome).toEqual({ kind: "ready", athleteId: "sofia" })
  })

  it("avvisa se l'allieva ha già una tessera di quell'anno", () => {
    const existing: ExistingCard = {
      athleteId: "giulia",
      entity: "ENDAS",
      cardYear: 2026,
      cardNumber: "999999",
    }
    const rows = buildImportPlan({
      files: [file(0, { ok: true, card: card() })],
      athletes: ATHLETES,
      existingCards: [existing],
    })

    expect(rows[0].outcome).toEqual({
      kind: "already_present",
      athleteId: "giulia",
      sameNumber: false,
    })
  })

  it("riconosce la tessera già in archivio dal numero", () => {
    const rows = buildImportPlan({
      files: [file(0, { ok: true, card: card() })],
      athletes: ATHLETES,
      existingCards: [
        {
          athleteId: "giulia",
          entity: "ENDAS",
          cardYear: 2026,
          cardNumber: "1293190",
        },
      ],
    })

    expect(rows[0].outcome).toEqual({ kind: "duplicate_number", inBatch: false })
  })

  it("tiene la prima e segnala la seconda quando lo stesso file arriva due volte", () => {
    const rows = buildImportPlan({
      files: [
        file(0, { ok: true, card: card() }),
        file(1, { ok: true, card: card() }),
      ],
      athletes: ATHLETES,
      existingCards: [],
    })

    expect(rows[0].outcome).toEqual({ kind: "ready", athleteId: "giulia" })
    expect(rows[1].outcome).toEqual({ kind: "duplicate_number", inBatch: true })
    expect(readyRows(rows)).toHaveLength(1)
  })

  it("segnala due tessere diverse per la stessa allieva nello stesso anno", () => {
    const rows = buildImportPlan({
      files: [
        file(0, { ok: true, card: card() }),
        file(1, { ok: true, card: card({ cardNumber: "1293191" }) }),
      ],
      athletes: ATHLETES,
      existingCards: [],
    })

    expect(rows[0].outcome).toEqual({ kind: "ready", athleteId: "giulia" })
    expect(rows[1].outcome).toEqual({ kind: "duplicate_number", inBatch: true })
  })

  it("non considera duplicata la tessera dell'anno dopo", () => {
    const rows = buildImportPlan({
      files: [
        file(0, { ok: true, card: card() }),
        file(
          1,
          {
            ok: true,
            card: card({
              cardNumber: "1400000",
              cardYear: 2027,
              issueDate: d("2027-09-14"),
              expiryDate: d("2028-09-13"),
            }),
          },
        ),
      ],
      athletes: ATHLETES,
      existingCards: [],
    })

    expect(readyRows(rows)).toHaveLength(2)
  })

  it("segnala l'ambiguità fra omonime con la stessa data di nascita", () => {
    const gemella: MatchCandidate = { ...GIULIA, id: "gemella" }
    const rows = buildImportPlan({
      files: [file(0, { ok: true, card: card() })],
      athletes: [GIULIA, gemella],
      existingCards: [],
    })

    expect(rows[0].outcome).toEqual({
      kind: "ambiguous",
      athleteIds: ["giulia", "gemella"],
    })
  })
})
