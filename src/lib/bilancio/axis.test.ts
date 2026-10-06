import { describe, expect, it } from "vitest"

import { niceAxisTicks } from "./axis"

const eur = (cents: number[]) => cents.map((c) => c / 100)

describe("niceAxisTicks", () => {
  it("massimo 1.900 €: da 0 a 2.000 a passi di 500", () => {
    const axis = niceAxisTicks(1900_00)
    expect(eur(axis.ticks)).toEqual([0, 500, 1000, 1500, 2000])
    expect(axis.stepCents).toBe(500_00)
    expect(axis.topCents).toBe(2000_00)
  })

  it("massimo 320 €: da 0 a 400 a passi di 100", () => {
    const axis = niceAxisTicks(320_00)
    expect(eur(axis.ticks)).toEqual([0, 100, 200, 300, 400])
  })

  it("il passo è sempre costante e le tacche partono da zero", () => {
    for (const max of [1, 49_00, 99_99, 1234_56, 7_800_00, 15_000_00, 123_456_00]) {
      const { ticks, stepCents, topCents } = niceAxisTicks(max)
      expect(ticks[0], String(max)).toBe(0)
      for (let i = 1; i < ticks.length; i++) {
        expect(ticks[i] - ticks[i - 1], String(max)).toBe(stepCents)
      }
      // La barra più alta sta sotto la cima, e le tacche restano poche
      expect(topCents, String(max)).toBeGreaterThanOrEqual(max)
      expect(ticks.length, String(max)).toBeLessThanOrEqual(6)
      expect(ticks.length, String(max)).toBeGreaterThanOrEqual(2)
    }
  })

  it("un massimo già tondo non aggiunge una tacca in più", () => {
    expect(eur(niceAxisTicks(2000_00).ticks)).toEqual([0, 500, 1000, 1500, 2000])
    expect(eur(niceAxisTicks(500_00).ticks)).toEqual([0, 100, 200, 300, 400, 500])
  })

  it("le tacche sono euro interi: l'etichetta non ha bisogno di decimali", () => {
    for (const max of [320_00, 1900_00, 47_50, 9_999_99]) {
      for (const tick of niceAxisTicks(max).ticks) {
        expect(tick % 100, `${max} → ${tick}`).toBe(0)
      }
    }
  })

  it("senza dati l'asse c'è lo stesso", () => {
    expect(eur(niceAxisTicks(0).ticks)).toEqual([0, 100])
    expect(eur(niceAxisTicks(-500).ticks)).toEqual([0, 100])
    expect(eur(niceAxisTicks(Number.NaN).ticks)).toEqual([0, 100])
  })
})
