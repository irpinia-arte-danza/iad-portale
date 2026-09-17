import { describe, expect, it } from "vitest"

import { receiptPdfFileName } from "./pdf-file-name"

describe("receiptPdfFileName", () => {
  it("usa numero di ricevuta e nome dell'allieva", () => {
    const { utf8 } = receiptPdfFileName({
      receiptNumber: "IAD/2026-27/306",
      athleteName: "Simona Sica",
    })
    expect(utf8).toBe("Ricevuta IAD-2026-27-306 - Simona Sica.pdf")
  })

  // Le barre del numero non possono finire in un nome di file: diventerebbero
  // cartelle sia sul Mac di Giuseppina sia dentro WhatsApp
  it("sostituisce le barre del numero con trattini", () => {
    const { utf8 } = receiptPdfFileName({
      receiptNumber: "IAD/2026-27/045/S",
      athleteName: "Elena Rossi",
    })
    expect(utf8).toContain("IAD-2026-27-045-S")
    expect(utf8).not.toContain("/")
  })

  it("la forma ASCII toglie gli accenti, quella UTF-8 li tiene", () => {
    const { ascii, utf8 } = receiptPdfFileName({
      receiptNumber: "IAD/2026-27/001",
      athleteName: "Niccolò Forlì",
    })
    expect(utf8).toContain("Niccolò Forlì")
    expect(ascii).toContain("Niccolo Forli")
  })

  it("scarta i caratteri che i filesystem rifiutano", () => {
    const { utf8 } = receiptPdfFileName({
      receiptNumber: "IAD/2026-27/002",
      athleteName: 'Anna "La" Rossi: <test>',
    })
    for (const forbidden of ['"', "<", ">", ":", "|", "?", "*"]) {
      expect(utf8).not.toContain(forbidden)
    }
  })

  it("non lascia spazi doppi quando il nome dell'allieva manca", () => {
    const { utf8 } = receiptPdfFileName({
      receiptNumber: "IAD/2026-27/003",
      athleteName: "",
    })
    expect(utf8).toBe("Ricevuta IAD-2026-27-003 -.pdf")
    expect(utf8).not.toContain("  ")
  })

  it("termina sempre con .pdf", () => {
    const { ascii, utf8 } = receiptPdfFileName({
      receiptNumber: "IAD/2026-27/004",
      athleteName: "Maria Rossi",
    })
    expect(ascii.endsWith(".pdf")).toBe(true)
    expect(utf8.endsWith(".pdf")).toBe(true)
  })
})
