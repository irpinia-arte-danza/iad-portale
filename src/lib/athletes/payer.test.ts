import { describe, expect, it } from "vitest"

import { athleteListPayer, pickPayerRelation } from "./payer"

const AT = new Date("2026-10-06T00:00:00.000Z")
const MINORENNE = new Date("2015-04-02T00:00:00.000Z")
const MAGGIORENNE = new Date("2000-04-02T00:00:00.000Z")

const parent = (id: string, firstName: string, lastName: string) => ({
  id,
  firstName,
  lastName,
})

const relation = (
  p: ReturnType<typeof parent>,
  over: { isPrimaryPayer?: boolean; isPrimaryContact?: boolean } = {},
) => ({
  isPrimaryPayer: over.isPrimaryPayer ?? false,
  isPrimaryContact: over.isPrimaryContact ?? false,
  parent: p,
})

const mamma = parent("p1", "Giuseppina", "Ciociola")
const papa = parent("p2", "Mario", "Rossi")

describe("pickPayerRelation", () => {
  it("il pagante indicato vince sul contatto e sull'ordine", () => {
    const scelto = pickPayerRelation([
      relation(papa, { isPrimaryContact: true }),
      relation(mamma, { isPrimaryPayer: true }),
    ])
    expect(scelto?.parent.id).toBe("p1")
  })

  it("senza pagante indicato vale il contatto principale", () => {
    const scelto = pickPayerRelation([
      relation(papa),
      relation(mamma, { isPrimaryContact: true }),
    ])
    expect(scelto?.parent.id).toBe("p1")
  })

  it("senza indicazioni vale il primo collegato", () => {
    expect(pickPayerRelation([relation(papa), relation(mamma)])?.parent.id).toBe(
      "p2",
    )
  })

  it("nessun genitore collegato: nessun pagante", () => {
    expect(pickPayerRelation([])).toBeNull()
  })
})

describe("athleteListPayer", () => {
  it("col genitore collegato il nome è «Cognome Nome», come il resto dell'elenco", () => {
    const payer = athleteListPayer(
      {
        dateOfBirth: MINORENNE,
        parentRelations: [relation(mamma, { isPrimaryPayer: true })],
      },
      AT,
    )
    expect(payer).toEqual({
      kind: "PARENT",
      parentId: "p1",
      name: "Ciociola Giuseppina",
    })
  })

  it("maggiorenne senza genitori: paga lei, e non è un buco", () => {
    expect(
      athleteListPayer({ dateOfBirth: MAGGIORENNE, parentRelations: [] }, AT),
    ).toEqual({ kind: "ATHLETE" })
  })

  it("minorenne senza genitori: anagrafica da completare", () => {
    expect(
      athleteListPayer({ dateOfBirth: MINORENNE, parentRelations: [] }, AT),
    ).toEqual({ kind: "NONE" })
  })

  it("il giorno del diciottesimo compleanno paga lei", () => {
    const diciotto = new Date("2008-10-06T00:00:00.000Z")
    expect(
      athleteListPayer({ dateOfBirth: diciotto, parentRelations: [] }, AT),
    ).toEqual({ kind: "ATHLETE" })
  })
})
