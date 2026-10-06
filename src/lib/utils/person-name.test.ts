import { describe, expect, it } from "vitest"

import { fullName, listName, listNameOrFrozen } from "./person-name"

describe("listName", () => {
  it("negli elenchi il cognome viene prima", () => {
    expect(listName({ firstName: "Maria", lastName: "Rossi" })).toBe(
      "Rossi Maria",
    )
  })

  it("nomi composti restano interi", () => {
    expect(
      listName({ firstName: "Maria Teresa", lastName: "Di Napoli" }),
    ).toBe("Di Napoli Maria Teresa")
  })

  it("un pezzo che manca non lascia spazi doppi", () => {
    expect(listName({ firstName: "Maria", lastName: null })).toBe("Maria")
    expect(listName({ firstName: null, lastName: "Rossi" })).toBe("Rossi")
    expect(listName({ firstName: "  ", lastName: " Rossi " })).toBe("Rossi")
    expect(listName({ firstName: null, lastName: null })).toBe("")
  })
})

describe("fullName", () => {
  it("nei titoli e nei documenti il nome viene prima", () => {
    expect(fullName({ firstName: "Maria", lastName: "Rossi" })).toBe(
      "Maria Rossi",
    )
  })

  it("è l'ordine opposto a quello degli elenchi", () => {
    const p = { firstName: "Giuseppina", lastName: "Ciociola" }
    expect(fullName(p)).not.toBe(listName(p))
  })
})

describe("listNameOrFrozen", () => {
  it("con nome e cognome veri usa l'ordine da elenco", () => {
    expect(
      listNameOrFrozen(
        { firstName: "Maria", lastName: "Rossi" },
        "Maria Rossi",
      ),
    ).toBe("Rossi Maria")
  })

  it("senza anagrafica collegata stampa il dato congelato così com'è", () => {
    expect(listNameOrFrozen(null, "Maria Teresa Di Napoli")).toBe(
      "Maria Teresa Di Napoli",
    )
  })

  it("niente da stampare: null, così chi chiama mette il trattino", () => {
    expect(listNameOrFrozen(null, null)).toBeNull()
    expect(listNameOrFrozen(null, "   ")).toBeNull()
    expect(
      listNameOrFrozen({ firstName: null, lastName: null }, null),
    ).toBeNull()
  })

  it("un'anagrafica senza nome non cancella il dato congelato", () => {
    expect(
      listNameOrFrozen({ firstName: "", lastName: "" }, "Maria Rossi"),
    ).toBe("Maria Rossi")
  })
})
