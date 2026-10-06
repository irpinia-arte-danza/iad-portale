import { describe, expect, it } from "vitest"

import { managementResult } from "./result"

describe("managementResult", () => {
  it("entrate sopra le uscite: avanzo", () => {
    expect(managementResult(125000)).toEqual({
      label: "Avanzo di gestione",
      amountCents: 125000,
      isDeficit: false,
    })
  })

  it("uscite sopra le entrate: disavanzo, con l'importo senza segno", () => {
    expect(managementResult(-12000)).toEqual({
      label: "Disavanzo di gestione",
      amountCents: 12000,
      isDeficit: true,
    })
  })

  it("pareggio: non è un disavanzo", () => {
    expect(managementResult(0)).toEqual({
      label: "Avanzo di gestione",
      amountCents: 0,
      isDeficit: false,
    })
  })

  it("un centesimo sotto basta a fare un disavanzo", () => {
    expect(managementResult(-1).isDeficit).toBe(true)
  })
})
