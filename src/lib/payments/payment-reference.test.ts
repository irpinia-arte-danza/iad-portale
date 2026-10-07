import { describe, expect, it } from "vitest"

import { buildPaymentReference, describeMonths } from "./payment-reference"

// Le date sono mezzanotte UTC: formatMeseIt e la causale ragionano in UTC,
// così un bonifico del 10 ottobre non diventa settembre a Roma
const m = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

describe("describeMonths", () => {
  it("un mese: «ottobre 2026»", () => {
    expect(describeMonths([m("2026-10-10")])).toBe("ottobre 2026")
  })

  it("due mesi dello stesso anno: «ottobre e novembre 2026»", () => {
    expect(describeMonths([m("2026-11-10"), m("2026-10-10")])).toBe("ottobre e novembre 2026")
  })

  it("tre mesi: virgole e una sola «e»", () => {
    expect(describeMonths([m("2026-10-10"), m("2026-11-10"), m("2026-12-10")])).toBe(
      "ottobre, novembre e dicembre 2026",
    )
  })

  it("a cavallo d'anno ogni anno porta il suo", () => {
    expect(describeMonths([m("2026-12-10"), m("2027-01-10")])).toBe(
      "dicembre 2026 e gennaio 2027",
    )
    expect(describeMonths([m("2026-11-10"), m("2026-12-10"), m("2027-01-10"), m("2027-02-10")])).toBe(
      "novembre e dicembre 2026 e gennaio e febbraio 2027",
    )
  })

  it("lo stesso mese due volte (due corsi) si conta una volta", () => {
    expect(describeMonths([m("2026-10-10"), m("2026-10-15")])).toBe("ottobre 2026")
  })

  it("il giorno del mese non conta: il 31 e il 1 dello stesso mese sono lo stesso mese", () => {
    expect(describeMonths([m("2026-10-01"), m("2026-10-31")])).toBe("ottobre 2026")
  })

  it("niente mesi: stringa vuota", () => {
    expect(describeMonths([])).toBe("")
  })
})

describe("buildPaymentReference", () => {
  const nome = "Mia Rossi"

  it("un solo mese: «Contributo ottobre 2026 · Mia Rossi»", () => {
    expect(
      buildPaymentReference({ athleteName: nome, items: [{ kind: "month", month: m("2026-10-10") }] }),
    ).toBe("Contributo ottobre 2026 · Mia Rossi")
  })

  it("più mesi: al plurale, «Contributi ottobre e novembre 2026 · Mia Rossi»", () => {
    expect(
      buildPaymentReference({
        athleteName: nome,
        items: [
          { kind: "month", month: m("2026-10-10") },
          { kind: "month", month: m("2026-11-10") },
        ],
      }),
    ).toBe("Contributi ottobre e novembre 2026 · Mia Rossi")
  })

  it("mesi duplicati restano un solo contributo", () => {
    expect(
      buildPaymentReference({
        athleteName: nome,
        items: [
          { kind: "month", month: m("2026-10-10") },
          { kind: "month", month: m("2026-10-10") },
        ],
      }),
    ).toBe("Contributo ottobre 2026 · Mia Rossi")
  })

  it("solo una voce già descritta: la voce e il nome", () => {
    expect(
      buildPaymentReference({
        athleteName: nome,
        items: [{ kind: "other", label: "Contributo di iscrizione 2026/2027" }],
      }),
    ).toBe("Contributo di iscrizione 2026/2027 · Mia Rossi")
  })

  it("mesi e altre voci: uniti da « + », i mesi per primi", () => {
    expect(
      buildPaymentReference({
        athleteName: nome,
        items: [
          { kind: "other", label: "Contributo di iscrizione 2026/2027" },
          { kind: "month", month: m("2027-01-10") },
          { kind: "month", month: m("2026-12-10") },
        ],
      }),
    ).toBe("Contributi dicembre 2026 e gennaio 2027 + Contributo di iscrizione 2026/2027 · Mia Rossi")
  })

  it("nessuna voce: «Contributo · Nome»", () => {
    expect(buildPaymentReference({ athleteName: nome, items: [] })).toBe("Contributo · Mia Rossi")
  })

  it("il nome arriva ripulito dagli spazi attorno", () => {
    expect(
      buildPaymentReference({ athleteName: "  Mia Rossi ", items: [{ kind: "month", month: m("2026-10-10") }] }),
    ).toBe("Contributo ottobre 2026 · Mia Rossi")
  })
})
