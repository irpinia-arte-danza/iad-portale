import { describe, expect, it } from "vitest"

import {
  calendarYearRange,
  fiscalYearOfRange,
  showsAcademicYearChip,
  yearNotCurrentNotice,
} from "./year-context"

describe("showsAcademicYearChip", () => {
  it("assente nelle pagine ad anno fiscale", () => {
    for (const path of [
      "/admin/receipts",
      "/admin/reports/bilancio",
      "/admin/reports/corrispettivi",
      "/admin/reports/annuale",
    ]) {
      expect(showsAcademicYearChip(path), path).toBe(false)
    }
  })

  it("presente nelle pagine ad anno accademico e in quelle senza anno", () => {
    for (const path of [
      "/admin/dashboard",
      "/admin/scadenze",
      "/admin/athletes",
      "/admin/athletes/123",
      "/admin/courses",
      "/admin/showcase",
      "/admin/parents",
      "/admin/tessere",
      "/admin/payments",
      "/admin/expenses",
      "/admin/settings",
    ]) {
      expect(showsAcademicYearChip(path), path).toBe(true)
    }
  })

  it("un percorso che comincia uguale ma è un'altra pagina non conta", () => {
    expect(showsAcademicYearChip("/admin/receipts-vecchie")).toBe(true)
  })
})

describe("yearNotCurrentNotice", () => {
  it("anno corrente: nessuna fascia", () => {
    expect(yearNotCurrentNotice("2026", "2026")).toBeNull()
    expect(yearNotCurrentNotice("2026-2027", "2026-2027")).toBeNull()
  })

  it("un altro anno: la fascia dice quale", () => {
    expect(yearNotCurrentNotice("2025", "2026")).toBe("Stai guardando il 2025")
    expect(yearNotCurrentNotice("2025-2026", "2026-2027")).toBe(
      "Stai guardando il 2025-2026",
    )
  })

  it("se non si sa quale sia l'anno scelto o il corrente, niente fascia", () => {
    expect(yearNotCurrentNotice(null, "2026")).toBeNull()
    expect(yearNotCurrentNotice("2025", null)).toBeNull()
  })
})

describe("anno fiscale e periodi", () => {
  it("l'anno come periodo", () => {
    expect(calendarYearRange(2025)).toEqual({
      from: "2025-01-01",
      to: "2025-12-31",
    })
  })

  it("un periodo dentro un anno appartiene a quell'anno", () => {
    expect(fiscalYearOfRange({ from: "2026-10-01", to: "2026-10-31" })).toBe(2026)
    expect(fiscalYearOfRange(calendarYearRange(2025))).toBe(2025)
  })

  it("un periodo a cavallo di due anni non ha un anno solo", () => {
    expect(
      fiscalYearOfRange({ from: "2026-11-01", to: "2027-01-31" }),
    ).toBeNull()
  })
})
