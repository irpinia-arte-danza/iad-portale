import { describe, expect, it } from "vitest"

import { formatReceiptNumber, nextReceiptSequence } from "./numbering"

describe("nextReceiptSequence", () => {
  it("prima ricevuta dopo la numerazione cartacea: 295", () => {
    expect(nextReceiptSequence(295, 0)).toBe(295)
  })

  it("contatore più alto dell'ultima emessa: vale il contatore", () => {
    expect(nextReceiptSequence(296, 295)).toBe(296)
  })

  it("contatore uguale a un numero già emesso: il successivo", () => {
    expect(nextReceiptSequence(300, 300)).toBe(301)
  })

  it("contatore abbassato sotto un numero emesso: si riparte dopo il più alto", () => {
    expect(nextReceiptSequence(10, 300)).toBe(301)
  })
})

describe("formatReceiptNumber", () => {
  it("quote, saggio e costumi", () => {
    const base = { prefix: "IAD/", academicYearLabel: "2026-2027", sequence: 295 }
    expect(formatReceiptNumber({ ...base, category: "REGULAR" })).toBe("IAD/2026-27/295")
    expect(formatReceiptNumber({ ...base, category: "SHOWCASE" })).toBe("IAD/2026-27/295/S")
    expect(formatReceiptNumber({ ...base, sequence: 7, category: "COSTUME" })).toBe(
      "IAD/2026-27/007/C",
    )
  })
})
