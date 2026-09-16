import { describe, expect, it } from "vitest"

import { composeAddress, type PersonAddressFields } from "./person-data"

function address(
  overrides: Partial<PersonAddressFields> = {},
): PersonAddressFields {
  return {
    residenceStreet: "Via Roma",
    residenceNumber: "1",
    residenceCap: "83048",
    residenceCity: "Montella",
    residenceProvince: "AV",
    ...overrides,
  }
}

describe("composeAddress", () => {
  it("mette insieme via, numero, CAP, comune e provincia", () => {
    expect(composeAddress(address())).toBe("Via Roma 1 — 83048 Montella (AV)")
  })

  it("senza numero civico non lascia spazi doppi", () => {
    expect(composeAddress(address({ residenceNumber: null }))).toBe(
      "Via Roma — 83048 Montella (AV)",
    )
  })

  it("con la sola via non aggiunge il trattino", () => {
    expect(
      composeAddress({
        residenceStreet: "Via Roma",
        residenceNumber: null,
        residenceCap: null,
        residenceCity: null,
        residenceProvince: null,
      }),
    ).toBe("Via Roma")
  })

  // Sulla ricevuta la riga della residenza non va stampata affatto
  it("senza nessun dato restituisce null", () => {
    expect(
      composeAddress({
        residenceStreet: null,
        residenceNumber: null,
        residenceCap: null,
        residenceCity: null,
        residenceProvince: null,
      }),
    ).toBeNull()
  })
})
