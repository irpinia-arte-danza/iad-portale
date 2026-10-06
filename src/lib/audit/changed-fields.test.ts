import { describe, expect, it } from "vitest"

import { changedFields } from "./changed-fields"

describe("changedFields", () => {
  it("elenca i campi cambiati, in ordine, senza i valori", () => {
    const fields = changedFields(
      { firstName: "Maria", lastName: "Rossi", phone: "333", notes: null },
      { firstName: "Maria", lastName: "Bianchi", phone: null, notes: "x" },
    )
    expect(fields).toEqual(["lastName", "notes", "phone"])
  })

  it("stringa vuota e null sono lo stesso vuoto", () => {
    expect(changedFields({ phone: null }, { phone: "" })).toEqual([])
  })

  it("le date si confrontano per istante", () => {
    const d = new Date("2014-05-05T00:00:00.000Z")
    expect(changedFields({ dateOfBirth: d }, { dateOfBirth: new Date(d) })).toEqual([])
    expect(
      changedFields({ dateOfBirth: d }, { dateOfBirth: new Date("2014-05-06T00:00:00.000Z") }),
    ).toEqual(["dateOfBirth"])
  })

  it("senza un prima, tutti i campi valorizzati contano come nuovi", () => {
    expect(changedFields(null, { a: 1, b: undefined, c: "x" })).toEqual(["a", "c"])
  })
})
