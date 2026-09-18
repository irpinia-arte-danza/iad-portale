import { describe, expect, it } from "vitest"

import { isSelfIssued, type ReceiptParties } from "./receipt-parties"

function parties(overrides: Partial<ReceiptParties> = {}): ReceiptParties {
  return {
    payerName: "Maria Rossi",
    payerFiscalCode: "RSSMRA80A41A509L",
    athleteName: "Elena Rossi",
    athleteFiscalCode: "RSSLNE15C52A509K",
    ...overrides,
  }
}

describe("pagante e allieva sono la stessa persona", () => {
  // Il caso della ricevuta 306: Simona Sica in entrambi i riquadri
  it("stesso codice fiscale: un riquadro solo", () => {
    expect(
      isSelfIssued(
        parties({
          payerName: "Simona Sica",
          payerFiscalCode: "SCISMN77T47A509T",
          athleteName: "Simona Sica",
          athleteFiscalCode: "SCISMN77T47A509T",
        }),
      ),
    ).toBe(true)
  })

  it("il confronto non si fa ingannare da spazi e minuscole", () => {
    expect(
      isSelfIssued(
        parties({
          payerFiscalCode: " scismn77t47a509t ",
          athleteFiscalCode: "SCISMN77T47A509T",
        }),
      ),
    ).toBe(true)
  })

  it("madre e figlia restano due riquadri", () => {
    expect(isSelfIssued(parties())).toBe(false)
  })
})

describe("quando i codici fiscali non bastano", () => {
  // Il caso da non sbagliare: due campi vuoti non sono una prova di identità
  it("entrambi i codici fiscali vuoti non rendono uguali due persone diverse", () => {
    expect(
      isSelfIssued(
        parties({
          payerName: "Maria Rossi",
          payerFiscalCode: null,
          athleteName: "Elena Rossi",
          athleteFiscalCode: null,
        }),
      ),
    ).toBe(false)
  })

  it("senza codici fiscali decide il nome", () => {
    expect(
      isSelfIssued(
        parties({
          payerName: "Simona Sica",
          payerFiscalCode: null,
          athleteName: "Simona Sica",
          athleteFiscalCode: null,
        }),
      ),
    ).toBe(true)
  })

  // Pagamento in contanti: il pagante può non avere il C.F., l'allieva sì.
  // Sono due persone diverse, e il documento deve continuare a dirlo.
  it("un codice fiscale solo significa persone diverse", () => {
    expect(
      isSelfIssued(parties({ payerFiscalCode: null })),
    ).toBe(false)
    expect(
      isSelfIssued(parties({ athleteFiscalCode: null })),
    ).toBe(false)
  })

  it("stringhe di soli spazi contano come vuote", () => {
    expect(
      isSelfIssued(
        parties({
          payerName: "Simona Sica",
          payerFiscalCode: "   ",
          athleteName: "Simona Sica",
          athleteFiscalCode: "",
        }),
      ),
    ).toBe(true)
  })
})
