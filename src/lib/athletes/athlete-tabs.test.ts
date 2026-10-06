import { describe, expect, it } from "vitest"

import {
  ATHLETE_TABS,
  athleteTabHref,
  DEFAULT_ATHLETE_TAB,
  parseAthleteTab,
} from "./athlete-tabs"

describe("schede della scheda allieva", () => {
  it("ogni valore valido si riconosce", () => {
    for (const tab of ATHLETE_TABS) {
      expect(parseAthleteTab(tab.id)).toBe(tab.id)
    }
  })

  it("valore sconosciuto o assente: panoramica", () => {
    expect(parseAthleteTab("contabilita")).toBe("panoramica")
    expect(parseAthleteTab("")).toBe("panoramica")
    expect(parseAthleteTab(undefined)).toBe("panoramica")
    expect(parseAthleteTab("PANORAMICA")).toBe("panoramica")
    expect(DEFAULT_ATHLETE_TAB).toBe("panoramica")
  })

  it("il link della panoramica non porta parametri inutili", () => {
    expect(athleteTabHref("abc", "panoramica")).toBe("/admin/athletes/abc")
    expect(athleteTabHref("abc", "contributi")).toBe(
      "/admin/athletes/abc?tab=contributi",
    )
  })

  it("ogni href si rilegge nella scheda da cui è partito", () => {
    for (const tab of ATHLETE_TABS) {
      const href = athleteTabHref("abc", tab.id)
      const value = href.split("tab=")[1]
      expect(parseAthleteTab(value)).toBe(tab.id)
    }
  })
})
