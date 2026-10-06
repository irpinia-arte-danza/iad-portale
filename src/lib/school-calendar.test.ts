import { describe, expect, it } from "vitest"

import {
  canPrepareNextAcademicYear,
  nextAcademicYearLabel,
} from "./school-calendar"
import { todayDateOnly } from "./utils/date-only"

// Giorno di calendario, come lo passa la pagina (todayDateOnly)
const giorno = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

// Anno accademico 2026-2027: finisce il 30 giugno 2027
const FINE = giorno("2027-06-30")

describe("canPrepareNextAcademicYear", () => {
  it("31 maggio: no", () => {
    expect(canPrepareNextAcademicYear(FINE, giorno("2027-05-31"))).toBe(false)
  })

  it("1° giugno: sì", () => {
    expect(canPrepareNextAcademicYear(FINE, giorno("2027-06-01"))).toBe(true)
  })

  it("a ottobre, con l'anno appena partito: no", () => {
    expect(canPrepareNextAcademicYear(FINE, giorno("2026-10-06"))).toBe(false)
  })

  it("d'estate e fino a dicembre dell'anno in cui finisce: sì", () => {
    expect(canPrepareNextAcademicYear(FINE, giorno("2027-08-15"))).toBe(true)
    expect(canPrepareNextAcademicYear(FINE, giorno("2027-12-31"))).toBe(true)
  })

  it("l'anno dopo la fine: no, a quel punto è un'anomalia e non un passaggio", () => {
    expect(canPrepareNextAcademicYear(FINE, giorno("2028-01-01"))).toBe(false)
    expect(canPrepareNextAcademicYear(FINE, giorno("2028-06-01"))).toBe(false)
  })

  it("conta il giorno di Roma: la sera del 31 maggio non è ancora giugno", () => {
    // 31/05 alle 23:30 di Roma = 21:30 UTC
    const sera = todayDateOnly(new Date("2027-05-31T21:30:00.000Z"))
    expect(canPrepareNextAcademicYear(FINE, sera)).toBe(false)
    // 1/06 alle 00:30 di Roma = 31/05 alle 22:30 UTC: a Roma è già giugno
    const notte = todayDateOnly(new Date("2027-05-31T22:30:00.000Z"))
    expect(canPrepareNextAcademicYear(FINE, notte)).toBe(true)
  })
})

describe("nextAcademicYearLabel", () => {
  it("l'anno dopo", () => {
    expect(nextAcademicYearLabel("2026-2027")).toBe("2027-2028")
  })

  it("un'etichetta che non è un anno accademico non produce niente", () => {
    expect(nextAcademicYearLabel("2026/2027")).toBeNull()
    expect(nextAcademicYearLabel("Anno di prova")).toBeNull()
    expect(nextAcademicYearLabel("2026-2028")).toBeNull()
  })
})
