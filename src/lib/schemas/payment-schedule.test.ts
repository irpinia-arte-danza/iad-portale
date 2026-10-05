import { describe, expect, it } from "vitest"

import { scheduleAmountSchema } from "./payment-schedule"

// Il punto della modifica importo è che va nei DUE versi: all'incasso
// l'importo può solo scendere, e senza questa non c'era modo di riportarlo su.

const base = { amountEur: 40, reason: "Riportato alla quota del corso" }

describe("scheduleAmountSchema", () => {
  it("accetta un aumento", () => {
    expect(scheduleAmountSchema.safeParse(base).success).toBe(true)
  })

  it("accetta una riduzione", () => {
    expect(
      scheduleAmountSchema.safeParse({ ...base, amountEur: 20 }).success,
    ).toBe(true)
  })

  it("accetta i centesimi", () => {
    expect(
      scheduleAmountSchema.safeParse({ ...base, amountEur: 37.5 }).success,
    ).toBe(true)
  })

  it("rifiuta lo zero", () => {
    const r = scheduleAmountSchema.safeParse({ ...base, amountEur: 0 })
    expect(r.success).toBe(false)
    if (r.success) return
    expect(r.error.issues[0]?.message).toBe(
      "L'importo deve essere maggiore di zero",
    )
  })

  it("rifiuta un importo negativo", () => {
    expect(
      scheduleAmountSchema.safeParse({ ...base, amountEur: -10 }).success,
    ).toBe(false)
  })

  it("rifiuta un importo assurdo", () => {
    expect(
      scheduleAmountSchema.safeParse({ ...base, amountEur: 99999 }).success,
    ).toBe(false)
  })

  it("il motivo è obbligatorio", () => {
    const r = scheduleAmountSchema.safeParse({ amountEur: 40, reason: "" })
    expect(r.success).toBe(false)
    if (r.success) return
    expect(r.error.issues[0]?.message).toContain("motivo")
  })

  it("il motivo non può essere due lettere", () => {
    expect(
      scheduleAmountSchema.safeParse({ ...base, reason: "ok" }).success,
    ).toBe(false)
  })

  it("il motivo di soli spazi non vale", () => {
    expect(
      scheduleAmountSchema.safeParse({ ...base, reason: "     " }).success,
    ).toBe(false)
  })
})
