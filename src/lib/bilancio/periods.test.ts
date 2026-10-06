import { describe, expect, it } from "vitest"

import {
  BILANCIO_PRESETS,
  bilancioPresetRange,
  matchBilancioPreset,
} from "./periods"

const OGGI = "2026-10-06"

describe("bilancioPresetRange", () => {
  it("anno fiscale: l'anno solare", () => {
    expect(bilancioPresetRange("anno-fiscale", OGGI)).toEqual({
      from: "2026-01-01",
      to: "2026-12-31",
    })
  })

  it("mese corrente: dal primo all'ultimo giorno", () => {
    expect(bilancioPresetRange("mese-corrente", OGGI)).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    })
  })

  it("ultimi 3 mesi: tre mesi di calendario, quello in corso compreso", () => {
    expect(bilancioPresetRange("ultimi-3-mesi", OGGI)).toEqual({
      from: "2026-08-01",
      to: "2026-10-31",
    })
  })

  it("a gennaio gli ultimi 3 mesi tornano nell'anno prima", () => {
    expect(bilancioPresetRange("ultimi-3-mesi", "2027-01-15")).toEqual({
      from: "2026-11-01",
      to: "2027-01-31",
    })
  })

  it("febbraio finisce il 28, o il 29 negli anni bisestili", () => {
    expect(bilancioPresetRange("mese-corrente", "2027-02-10").to).toBe(
      "2027-02-28",
    )
    expect(bilancioPresetRange("mese-corrente", "2028-02-10").to).toBe(
      "2028-02-29",
    )
  })
})

describe("matchBilancioPreset", () => {
  it("ogni preset riconosce il proprio intervallo", () => {
    for (const { key } of BILANCIO_PRESETS) {
      expect(matchBilancioPreset(bilancioPresetRange(key, OGGI), OGGI)).toBe(key)
    }
  })

  it("un intervallo scelto a mano non accende nessun chip: è «Altro periodo»", () => {
    expect(
      matchBilancioPreset({ from: "2026-09-01", to: "2027-06-30" }, OGGI),
    ).toBeNull()
  })

  it("il mese scorso non è più il «mese corrente»", () => {
    const settembre = bilancioPresetRange("mese-corrente", "2026-09-20")
    expect(matchBilancioPreset(settembre, OGGI)).toBeNull()
  })
})
