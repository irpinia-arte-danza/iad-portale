import { describe, expect, it } from "vitest"

import {
  athletesWithoutGuardianHref,
  countGuardianGaps,
  GUARDIAN_GAP_FILTER,
  hasGuardianGap,
} from "./guardian-gap"

const at = new Date("2026-09-29T12:00:00.000Z")
const nata = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

describe("hasGuardianGap", () => {
  it("segnala la minorenne senza genitori collegati", () => {
    expect(
      hasGuardianGap({ dateOfBirth: nata("2014-03-01"), linkedParents: 0 }, at),
    ).toBe(true)
  })

  it("non segnala la minorenne che ha un genitore", () => {
    expect(
      hasGuardianGap({ dateOfBirth: nata("2014-03-01"), linkedParents: 1 }, at),
    ).toBe(false)
  })

  it("non segnala la maggiorenne senza genitori: l'accesso e i contatti sono suoi", () => {
    expect(
      hasGuardianGap({ dateOfBirth: nata("2000-01-01"), linkedParents: 0 }, at),
    ).toBe(false)
  })

  it("il giorno del diciottesimo compleanno esce dal conteggio", () => {
    // 29/09/2026: chi è nata il 29/09/2008 compie 18 anni oggi
    expect(
      hasGuardianGap({ dateOfBirth: nata("2008-09-29"), linkedParents: 0 }, at),
    ).toBe(false)
    expect(
      hasGuardianGap({ dateOfBirth: nata("2008-09-30"), linkedParents: 0 }, at),
    ).toBe(true)
  })
})

describe("countGuardianGaps", () => {
  it("conta solo chi ricade nel caso", () => {
    expect(
      countGuardianGaps(
        [
          { dateOfBirth: nata("2014-03-01"), linkedParents: 0 }, // sì
          { dateOfBirth: nata("2015-06-10"), linkedParents: 0 }, // sì
          { dateOfBirth: nata("2014-03-01"), linkedParents: 2 }, // no
          { dateOfBirth: nata("1999-01-01"), linkedParents: 0 }, // no
        ],
        at,
      ),
    ).toBe(2)
  })

  it("elenco vuoto: zero", () => {
    expect(countGuardianGaps([], at)).toBe(0)
  })
})

describe("link condiviso", () => {
  it("la dashboard porta esattamente al filtro della lista", () => {
    expect(athletesWithoutGuardianHref()).toContain(
      `filtro=${GUARDIAN_GAP_FILTER}`,
    )
  })
})
