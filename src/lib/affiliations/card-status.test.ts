import { describe, expect, it } from "vitest"

import { seasonLabel, seasonYearFromAcademicYearStart } from "./card-status"

describe("seasonLabel", () => {
  it("l'anno sociale 2026 è la stagione 2026-2027", () => {
    expect(seasonLabel(2026)).toBe("2026-2027")
  })

  it("segue l'anno accademico: stesso numero, stessa stagione", () => {
    const inizio = new Date("2026-09-01T00:00:00.000Z")
    expect(seasonLabel(seasonYearFromAcademicYearStart(inizio))).toBe(
      "2026-2027",
    )
  })
})
