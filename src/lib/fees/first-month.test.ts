import { describe, expect, it } from "vitest"

import { dateOnly } from "@/lib/utils/date-only"

import {
  applyFirstMonthChoice,
  firstMonthWaiverReason,
  needsFirstMonthChoice,
} from "./first-month"

const sep10 = dateOnly(2026, 8, 10)
const oct10 = dateOnly(2026, 9, 10)
const nov10 = dateOnly(2026, 10, 10)

describe("needsFirstMonthChoice", () => {
  it("dopo il 15 del mese della prima rata → si chiede", () => {
    expect(needsFirstMonthChoice(dateOnly(2026, 8, 16), sep10)).toBe(true)
    expect(needsFirstMonthChoice(dateOnly(2026, 8, 28), sep10)).toBe(true)
  })

  it("fino al 15 compreso → no", () => {
    expect(needsFirstMonthChoice(dateOnly(2026, 8, 15), sep10)).toBe(false)
    expect(needsFirstMonthChoice(dateOnly(2026, 8, 1), sep10)).toBe(false)
  })

  it("iscrizione ad agosto, prima dell'inizio dell'anno: si parte da settembre, niente scelta", () => {
    expect(needsFirstMonthChoice(dateOnly(2026, 7, 28), sep10)).toBe(false)
  })

  it("nessuna rata → no", () => {
    expect(needsFirstMonthChoice(dateOnly(2026, 8, 28), null)).toBe(false)
  })
})

describe("applyFirstMonthChoice", () => {
  const base = {
    enrollmentDate: dateOnly(2026, 8, 28),
    dueDates: [sep10, oct10, nov10],
    monthlyFeeCents: 4000,
  }

  it("default (nessuna scelta o intero): tutto come prima", () => {
    for (const choice of [null, { kind: "FULL" as const }]) {
      expect(applyFirstMonthChoice({ ...base, choice }).map((d) => [d.status, d.amountCents])).toEqual([
        ["DUE", 4000],
        ["DUE", 4000],
        ["DUE", 4000],
      ])
    }
  })

  it("non dovuto: settembre WAIVED con il motivo, ottobre in poi DUE pieni", () => {
    const drafts = applyFirstMonthChoice({ ...base, choice: { kind: "WAIVED" } })
    expect(drafts[0]).toEqual({
      dueDate: sep10,
      amountCents: 4000,
      status: "WAIVED",
      waiverReason: "iscrizione del 28/09/2026",
    })
    expect(drafts.slice(1).map((d) => [d.status, d.amountCents, d.waiverReason])).toEqual([
      ["DUE", 4000, null],
      ["DUE", 4000, null],
    ])
  })

  it("ridotto: solo la prima cambia importo", () => {
    const drafts = applyFirstMonthChoice({ ...base, choice: { kind: "REDUCED", amountCents: 1500 } })
    expect(drafts.map((d) => [d.status, d.amountCents])).toEqual([
      ["DUE", 1500],
      ["DUE", 4000],
      ["DUE", 4000],
    ])
  })

  it("scelta arrivata per un'iscrizione entro il 15: ignorata", () => {
    const drafts = applyFirstMonthChoice({
      ...base,
      enrollmentDate: dateOnly(2026, 8, 12),
      choice: { kind: "WAIVED" },
    })
    expect(drafts.every((d) => d.status === "DUE")).toBe(true)
  })

  it("il motivo usa la data di calendario", () => {
    expect(firstMonthWaiverReason(dateOnly(2027, 0, 31))).toBe("iscrizione del 31/01/2027")
  })
})
