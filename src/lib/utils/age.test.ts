import { describe, expect, it } from "vitest"

import { isMinorAt } from "./age"

// Giorni di calendario a mezzanotte UTC, come le colonne @db.Date
function day(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`)
}

describe("isMinorAt", () => {
  it("una bambina di otto anni è minorenne", () => {
    expect(isMinorAt(day("2018-03-12"), day("2026-09-21"))).toBe(true)
  })

  it("una ventunenne non lo è", () => {
    expect(isMinorAt(day("2005-04-02"), day("2026-09-21"))).toBe(false)
  })

  it("il giorno del diciottesimo compleanno è già maggiorenne", () => {
    expect(isMinorAt(day("2008-09-21"), day("2026-09-21"))).toBe(false)
  })

  it("il giorno prima del compleanno è ancora minorenne", () => {
    expect(isMinorAt(day("2008-09-22"), day("2026-09-21"))).toBe(true)
  })

  // L'età si calcola alla data di emissione: la stessa ricevuta emessa in due
  // giorni diversi può dare esiti diversi, ed è corretto così
  it("conta la data di emissione, non quella di oggi", () => {
    const nascita = day("2008-09-21")
    expect(isMinorAt(nascita, day("2026-09-20"))).toBe(true)
    expect(isMinorAt(nascita, day("2026-09-21"))).toBe(false)
  })

  it("nata il 29 febbraio: nel dubbio resta minorenne un giorno in più", () => {
    const nascita = day("2008-02-29")
    expect(isMinorAt(nascita, day("2026-02-28"))).toBe(true)
    expect(isMinorAt(nascita, day("2026-03-01"))).toBe(false)
  })
})
