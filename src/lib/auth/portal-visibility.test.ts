import { describe, expect, it } from "vitest"

import { isMinorAt } from "@/lib/utils/age"

import type { PortalScope } from "./portal-scope"
import {
  canSeePersonalData,
  canSeeReceipt,
  minorBornAfter,
  personalDataScopeWhere,
} from "./portal-visibility"

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const OGGI = d("2026-10-06")

const genitoreA: PortalScope = { kind: "parent", parentId: "parent-a" }
const genitoreB: PortalScope = { kind: "parent", parentId: "parent-b" }
const allieva: PortalScope = { kind: "athlete", athleteId: "athlete-1" }

const minorenne = { dateOfBirth: d("2012-03-15") }
const maggiorenne = { dateOfBirth: d("2004-03-15") }
// Compie 18 anni oggi
const diciottenneOggi = { dateOfBirth: d("2008-10-06") }

describe("canSeePersonalData", () => {
  it("il genitore vede i dati personali della figlia minorenne", () => {
    expect(canSeePersonalData(genitoreA, minorenne, OGGI)).toBe(true)
  })

  it("della figlia maggiorenne il genitore non vede più i dati personali", () => {
    expect(canSeePersonalData(genitoreA, maggiorenne, OGGI)).toBe(false)
    expect(canSeePersonalData(genitoreA, diciottenneOggi, OGGI)).toBe(false)
  })

  it("l'allieva con accesso proprio vede tutto di sé", () => {
    expect(canSeePersonalData(allieva, maggiorenne, OGGI)).toBe(true)
  })
})

describe("personalDataScopeWhere", () => {
  it("per un genitore aggiunge il filtro sulla minore età", () => {
    expect(personalDataScopeWhere(genitoreA, OGGI)).toEqual({
      parentRelations: { some: { parentId: "parent-a" } },
      dateOfBirth: { gt: d("2008-10-06") },
    })
  })

  it("per un'allieva è il solo ambito", () => {
    expect(personalDataScopeWhere(allieva, OGGI)).toEqual({ id: "athlete-1" })
  })

  // Il filtro e isMinorAt devono dire la stessa cosa, giorno per giorno:
  // nata il 29 febbraio compresa
  it("minorBornAfter coincide con isMinorAt", () => {
    const giorni = [
      d("2026-02-27"),
      d("2026-02-28"),
      d("2026-03-01"),
      d("2026-03-02"),
      d("2026-10-05"),
      d("2026-10-06"),
      d("2026-10-07"),
    ]
    const nascite = [
      d("2008-02-28"),
      d("2008-02-29"),
      d("2008-03-01"),
      d("2008-10-05"),
      d("2008-10-06"),
      d("2008-10-07"),
    ]
    for (const at of giorni) {
      const cutoff = minorBornAfter(at)
      for (const dob of nascite) {
        expect(
          dob.getTime() > cutoff.getTime(),
          `${dob.toISOString()} il ${at.toISOString()}`,
        ).toBe(isMinorAt(dob, at))
      }
    }
  })
})

describe("canSeeReceipt", () => {
  it("il genitore vede solo le ricevute intestate a lui", () => {
    expect(canSeeReceipt(genitoreA, { payerId: "parent-a" })).toBe(true)
    expect(canSeeReceipt(genitoreB, { payerId: "parent-a" })).toBe(false)
    // Intestata all'allieva stessa (payerId nullo): non al genitore
    expect(canSeeReceipt(genitoreA, { payerId: null })).toBe(false)
  })

  it("l'allieva vede tutte le ricevute che la riguardano", () => {
    expect(canSeeReceipt(allieva, { payerId: "parent-a" })).toBe(true)
    expect(canSeeReceipt(allieva, { payerId: null })).toBe(true)
  })
})
