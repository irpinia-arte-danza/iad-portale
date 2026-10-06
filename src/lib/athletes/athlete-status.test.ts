import { describe, expect, it } from "vitest"

import { athleteStatusStrip, type StatusInput } from "./athlete-status"

const AT = new Date("2026-10-06T09:00:00.000Z")
const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const cert = (expiry: string) => ({
  expiryDate: d(expiry),
  createdAt: d("2026-09-01"),
})
const card = (year: number, expiry: string | null) => ({
  entity: "ENDAS",
  cardYear: year,
  expiryDate: expiry ? d(expiry) : null,
  createdAt: d("2026-09-14"),
})

const BASE: StatusInput = {
  certificates: [],
  cards: [],
  schedules: [],
  currentAcademicYear: { startDate: d("2026-09-01") },
  at: AT,
}

describe("certificato", () => {
  it("assente: rosso, con il tasto per caricarlo", () => {
    const { certificate } = athleteStatusStrip(BASE)
    expect(certificate.tone).toBe("red")
    expect(certificate.label).toBe("Certificato mancante")
    expect(certificate.action).toBe("CARICA_CERTIFICATO")
  })

  it("scaduto: rosso, con la data", () => {
    const { certificate } = athleteStatusStrip({
      ...BASE,
      certificates: [cert("2026-09-30")],
    })
    expect(certificate.tone).toBe("red")
    expect(certificate.detail).toBe("Scaduto il 30/09/2026")
    expect(certificate.action).toBe("CARICA_CERTIFICATO")
  })

  it("in scadenza: ambra, con la data", () => {
    const { certificate } = athleteStatusStrip({
      ...BASE,
      certificates: [cert("2026-10-20")],
    })
    expect(certificate.tone).toBe("amber")
    expect(certificate.detail).toBe("Scade il 20/10/2026")
  })

  it("valido: neutro, con la data", () => {
    const { certificate } = athleteStatusStrip({
      ...BASE,
      certificates: [cert("2027-06-30")],
    })
    expect(certificate.tone).toBe("neutral")
    expect(certificate.detail).toBe("Fino al 30/06/2027")
    expect(certificate.action).toBeNull()
  })

  it("con più certificati vale quello che scade più in là", () => {
    const { certificate } = athleteStatusStrip({
      ...BASE,
      certificates: [cert("2026-09-30"), cert("2027-06-30")],
    })
    expect(certificate.tone).toBe("neutral")
  })
})

describe("contributi", () => {
  it("senza ritardi: in regola, neutro", () => {
    const { contributions } = athleteStatusStrip({
      ...BASE,
      schedules: [
        { status: "DUE", dueDate: d("2026-10-10"), amountCents: 4000 },
        { status: "PAID", dueDate: d("2026-09-10"), amountCents: 4000 },
      ],
    })
    expect(contributions.tone).toBe("neutral")
    expect(contributions.label).toBe("Contributi in regola")
    expect(contributions.overdueCents).toBe(0)
  })

  it("in ritardo: ambra, con la somma delle rate scadute", () => {
    const { contributions } = athleteStatusStrip({
      ...BASE,
      schedules: [
        { status: "DUE", dueDate: d("2026-09-10"), amountCents: 4000 },
        { status: "DUE", dueDate: d("2026-10-05"), amountCents: 4000 },
        { status: "DUE", dueDate: d("2026-10-10"), amountCents: 5000 },
        { status: "WAIVED", dueDate: d("2026-08-10"), amountCents: 9900 },
        { status: "PAID", dueDate: d("2026-07-10"), amountCents: 9900 },
      ],
    })
    expect(contributions.tone).toBe("amber")
    expect(contributions.overdueCents).toBe(8000)
    // Lo spazio prima dell'euro è unificatore (U+00A0), come lo mette Intl
    expect(contributions.detail?.replace(/\u00a0/g, " ")).toBe("80,00 €")
  })

  it("la rata di oggi non è in ritardo", () => {
    const { contributions } = athleteStatusStrip({
      ...BASE,
      schedules: [{ status: "DUE", dueDate: d("2026-10-06"), amountCents: 4000 }],
    })
    expect(contributions.overdueCents).toBe(0)
  })
})

describe("tessera", () => {
  it("presente e valida: neutro, con la scadenza", () => {
    const { card: item } = athleteStatusStrip({
      ...BASE,
      cards: [card(2026, "2027-09-13")],
    })
    expect(item.tone).toBe("neutral")
    expect(item.label).toBe("Tesserata 2026")
    expect(item.action).toBeNull()
  })

  it("assente: ambra, con il rimando all'elenco da tesserare", () => {
    const { card: item } = athleteStatusStrip(BASE)
    expect(item.tone).toBe("amber")
    expect(item.label).toBe("Non tesserata 2026")
    expect(item.action).toBe("VAI_TESSERAMENTO")
  })

  it("la tessera dell'anno prima non vale per quest'anno", () => {
    const { card: item } = athleteStatusStrip({
      ...BASE,
      cards: [card(2025, "2026-09-13")],
    })
    expect(item.label).toBe("Non tesserata 2026")
  })

  it("senza anno accademico corrente non si inventa uno stato", () => {
    const { card: item } = athleteStatusStrip({
      ...BASE,
      currentAcademicYear: null,
      cards: [card(2026, "2027-09-13")],
    })
    expect(item.tone).toBe("neutral")
    expect(item.action).toBeNull()
  })
})
