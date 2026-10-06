import { describe, expect, it } from "vitest"

import {
  isSearchable,
  mergeHits,
  nameSearchWhere,
  searchTerms,
  type AthleteHit,
  type ParentHit,
} from "./person-search"

const term = (value: string) => ({
  OR: [
    { firstName: { contains: value, mode: "insensitive" } },
    { lastName: { contains: value, mode: "insensitive" } },
  ],
})

describe("query della ricerca", () => {
  it("una parola sola cerca nel nome e nel cognome", () => {
    expect(nameSearchWhere("ros")).toEqual({ AND: [term("ros")] })
  })

  it("nome e cognome in qualsiasi ordine danno la stessa query", () => {
    expect(nameSearchWhere("Rossi Maria")).toEqual({
      AND: [term("Rossi"), term("Maria")],
    })
    expect(nameSearchWhere("Maria Rossi")).toEqual({
      AND: [term("Maria"), term("Rossi")],
    })
  })

  it("spazi doppi, a capo e spazi ai bordi non contano", () => {
    expect(searchTerms("  Rossi   Maria \n")).toEqual(["Rossi", "Maria"])
    expect(nameSearchWhere(" Rossi  Maria ")).toEqual({
      AND: [term("Rossi"), term("Maria")],
    })
  })

  it("le maiuscole non contano: la query è sempre insensitive", () => {
    const where = nameSearchWhere("ROSSI")!
    for (const clause of where.AND) {
      for (const field of clause.OR) {
        expect(Object.values(field)[0].mode).toBe("insensitive")
      }
    }
  })

  it("sotto i due caratteri non si interroga il database", () => {
    expect(isSearchable("r")).toBe(false)
    expect(isSearchable(" r ")).toBe(false)
    expect(isSearchable("ro")).toBe(true)
    expect(nameSearchWhere("r")).toBeNull()
    expect(nameSearchWhere("   ")).toBeNull()
    expect(nameSearchWhere("")).toBeNull()
  })
})

describe("risultati", () => {
  const athlete = (n: number): AthleteHit => ({
    kind: "athlete",
    id: `a${n}`,
    name: `Allieva ${n}`,
    age: 10,
    course: "Moderno 2h",
    certificateMissing: false,
    overdue: false,
  })
  const parent = (n: number): ParentHit => ({
    kind: "parent",
    id: `p${n}`,
    name: `Genitore ${n}`,
    athletes: ["Allieva 1"],
    whatsappHref: null,
  })

  it("non più di otto, allieve e genitori alternati", () => {
    const hits = mergeHits(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(athlete),
      [1, 2, 3].map(parent),
    )
    expect(hits).toHaveLength(8)
    expect(hits.filter((h) => h.kind === "parent")).toHaveLength(3)
  })

  it("se da una parte non c'è niente, l'altra riempie l'elenco", () => {
    expect(mergeHits([1, 2, 3].map(athlete), [])).toHaveLength(3)
    expect(
      mergeHits([], [1, 2, 3, 4, 5, 6, 7, 8, 9].map(parent)),
    ).toHaveLength(8)
  })

  it("niente dati sensibili nel risultato", () => {
    const vietati = [
      "fiscalCode",
      "codiceFiscale",
      "notes",
      "medicalNotes",
      "instructorNotes",
      "email",
      "phone",
      "dateOfBirth",
      "residenceStreet",
    ]
    for (const hit of [athlete(1), parent(1)] as const) {
      // Sul valore serializzato: vale anche per quello che arriva al browser
      const serialized = JSON.stringify(hit)
      for (const key of vietati) {
        expect(Object.keys(hit), `${hit.kind}.${key}`).not.toContain(key)
        expect(serialized, `${hit.kind}.${key}`).not.toContain(`"${key}"`)
      }
    }
  })
})
