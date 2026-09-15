import { describe, expect, it } from "vitest"

import {
  EMPTY_NEW_ATHLETE_CERTIFICATE,
  newAthleteCertificateError,
  newAthleteCertificateFormData,
  suggestedExpiryDate,
  type NewAthleteCertificate,
} from "./new-athlete-certificate"

const filled: NewAthleteCertificate = {
  type: "NON_AGONISTICO",
  issueDate: "2026-09-10",
  expiryDate: "2027-09-10",
  file: null,
}

describe("newAthleteCertificateError", () => {
  it("sezione vuota: nessun certificato, nessun errore", () => {
    expect(newAthleteCertificateError(EMPTY_NEW_ATHLETE_CERTIFICATE)).toBeNull()
  })

  it("compilata correttamente: nessun errore", () => {
    expect(newAthleteCertificateError(filled)).toBeNull()
  })

  it("la data di emissione è obbligatoria", () => {
    expect(newAthleteCertificateError({ ...filled, issueDate: "" })).toBe(
      "Inserisci la data di emissione del certificato.",
    )
  })

  it("la scadenza è obbligatoria", () => {
    expect(newAthleteCertificateError({ ...filled, expiryDate: "" })).toBe(
      "Inserisci la data di scadenza del certificato.",
    )
  })

  it("solo il file senza date non basta", () => {
    const file = new File(["%PDF-"], "certificato.pdf", {
      type: "application/pdf",
    })
    expect(
      newAthleteCertificateError({ ...EMPTY_NEW_ATHLETE_CERTIFICATE, file }),
    ).toBe("Inserisci la data di emissione del certificato.")
  })

  it("la scadenza deve seguire l'emissione", () => {
    expect(
      newAthleteCertificateError({ ...filled, expiryDate: "2026-09-10" }),
    ).toBe("Data scadenza deve essere successiva a emissione")
  })

  it("file in formato non ammesso", () => {
    const file = new File(["x"], "certificato.docx", { type: "application/msword" })
    expect(newAthleteCertificateError({ ...filled, file })).toBe(
      "Formato non supportato (PDF, JPEG, PNG)",
    )
  })
})

describe("newAthleteCertificateFormData", () => {
  it("manda gli stessi campi del dialog certificato", () => {
    const formData = newAthleteCertificateFormData(filled)
    expect(formData.get("type")).toBe("NON_AGONISTICO")
    expect(formData.get("issueDate")).toBe("2026-09-10")
    expect(formData.get("expiryDate")).toBe("2027-09-10")
    expect(formData.get("file")).toBeNull()
  })
})

describe("suggestedExpiryDate", () => {
  it("un anno dopo l'emissione", () => {
    expect(suggestedExpiryDate("2026-09-10")).toBe("2027-09-10")
    expect(suggestedExpiryDate("2026-12-31")).toBe("2027-12-31")
  })

  it("il 29 febbraio diventa 28 febbraio", () => {
    expect(suggestedExpiryDate("2028-02-29")).toBe("2029-02-28")
  })
})
