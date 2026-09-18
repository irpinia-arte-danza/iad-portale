import { UserRole } from "@prisma/client"
import { describe, expect, it } from "vitest"

import { athleteScopeWhere, portalScopeOf } from "./portal-scope"

describe("athleteScopeWhere", () => {
  it("un genitore vede le allieve collegate a lui", () => {
    expect(athleteScopeWhere({ kind: "parent", parentId: "p1" })).toEqual({
      parentRelations: { some: { parentId: "p1" } },
    })
  })

  it("un'allieva vede solo sé stessa", () => {
    expect(athleteScopeWhere({ kind: "athlete", athleteId: "a1" })).toEqual({
      id: "a1",
    })
  })

  // Il filtro non decide sulle archiviate: lo storico dei pagamenti le vuole,
  // gli elenchi no. Restano scelte delle singole query, come prima.
  it("non impone nulla sulle allieve archiviate", () => {
    const filters = [
      athleteScopeWhere({ kind: "parent", parentId: "p1" }),
      athleteScopeWhere({ kind: "athlete", athleteId: "a1" }),
    ]
    for (const filter of filters) {
      expect(Object.keys(filter)).not.toContain("deletedAt")
    }
  })
})

describe("portalScopeOf", () => {
  it("un genitore con profilo ha l'ambito del genitore", () => {
    expect(
      portalScopeOf({
        role: UserRole.PARENT,
        parentId: "p1",
        athleteId: null,
      }),
    ).toEqual({ kind: "parent", parentId: "p1" })
  })

  it("un'allieva con profilo ha l'ambito dell'allieva", () => {
    expect(
      portalScopeOf({
        role: UserRole.ATHLETE,
        parentId: null,
        athleteId: "a1",
      }),
    ).toEqual({ kind: "athlete", athleteId: "a1" })
  })

  // Un admin non usa l'area riservata: non gli si costruisce un ambito
  it("un admin non ha ambito", () => {
    expect(
      portalScopeOf({ role: UserRole.ADMIN, parentId: null, athleteId: null }),
    ).toBeNull()
  })

  it("un insegnante non ha ambito", () => {
    expect(
      portalScopeOf({
        role: UserRole.TEACHER,
        parentId: null,
        athleteId: null,
      }),
    ).toBeNull()
  })

  // Ruolo giusto ma profilo mancante: nessun ambito, mai uno a metà
  it("senza profilo non si costruisce un ambito", () => {
    expect(
      portalScopeOf({ role: UserRole.PARENT, parentId: null, athleteId: null }),
    ).toBeNull()
    expect(
      portalScopeOf({
        role: UserRole.ATHLETE,
        parentId: null,
        athleteId: null,
      }),
    ).toBeNull()
  })
})
