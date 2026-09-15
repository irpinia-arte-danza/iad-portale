import { describe, expect, it } from "vitest"

import { dateOnly } from "@/lib/utils/date-only"

import { academicYearEndYear, monthlyDueDates } from "./monthly-due-dates"

const year2026 = {
  academicYearStart: dateOnly(2026, 8, 1),
  academicYearLabel: "2026-2027",
  renewalDay: 10,
}

function iso(dates: Date[]): string[] {
  return dates.map((d) => d.toISOString().slice(0, 10))
}

describe("monthlyDueDates", () => {
  it("iscrizione il 15/09: settembre compreso, scadenza il 10", () => {
    const dates = monthlyDueDates({ ...year2026, enrollmentDate: dateOnly(2026, 8, 15) })
    expect(dates).toHaveLength(10)
    expect(iso(dates)[0]).toBe("2026-09-10")
    expect(iso(dates).at(-1)).toBe("2027-06-10")
  })

  it("prima o dopo il giorno 10 la prima rata è la stessa", () => {
    const early = monthlyDueDates({ ...year2026, enrollmentDate: dateOnly(2026, 8, 5) })
    const onDay = monthlyDueDates({ ...year2026, enrollmentDate: dateOnly(2026, 8, 10) })
    const late = monthlyDueDates({ ...year2026, enrollmentDate: dateOnly(2026, 8, 30) })
    expect(iso(early)).toEqual(iso(late))
    expect(iso(onDay)).toEqual(iso(late))
  })

  it("iscrizione il 20/12: dicembre compreso, 7 rate fino a giugno", () => {
    const dates = monthlyDueDates({ ...year2026, enrollmentDate: dateOnly(2026, 11, 20) })
    expect(iso(dates)).toEqual([
      "2026-12-10",
      "2027-01-10",
      "2027-02-10",
      "2027-03-10",
      "2027-04-10",
      "2027-05-10",
      "2027-06-10",
    ])
  })

  it("iscrizione a giugno: una sola rata; a luglio: nessuna", () => {
    expect(iso(monthlyDueDates({ ...year2026, enrollmentDate: dateOnly(2027, 5, 30) }))).toEqual([
      "2027-06-10",
    ])
    expect(monthlyDueDates({ ...year2026, enrollmentDate: dateOnly(2027, 6, 1) })).toEqual([])
  })

  it("iscrizione datata prima dell'inizio dell'anno: si parte da settembre, mai agosto", () => {
    const dates = monthlyDueDates({ ...year2026, enrollmentDate: dateOnly(2026, 7, 20) })
    expect(iso(dates)[0]).toBe("2026-09-10")
    expect(dates).toHaveLength(10)
  })

  it("giorno di rinnovo oltre la fine del mese: ultimo giorno del mese", () => {
    const dates = monthlyDueDates({
      ...year2026,
      renewalDay: 31,
      enrollmentDate: dateOnly(2026, 8, 15),
    })
    expect(iso(dates)).toContain("2026-09-30")
    expect(iso(dates)).toContain("2027-02-28")
    expect(iso(dates)).toContain("2026-10-31")
  })

  it("etichetta dell'anno non valida: nessuna rata", () => {
    expect(
      monthlyDueDates({ ...year2026, academicYearLabel: "2026", enrollmentDate: dateOnly(2026, 8, 15) }),
    ).toEqual([])
  })
})

describe("academicYearEndYear", () => {
  it("anno di fine dall'etichetta", () => {
    expect(academicYearEndYear("2026-2027")).toBe(2027)
    expect(academicYearEndYear("2026")).toBeNull()
  })
})
