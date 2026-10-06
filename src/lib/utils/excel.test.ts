import { describe, expect, it } from "vitest"

import { sanitizeCell } from "./excel"

describe("sanitizeCell", () => {
  it("un testo che inizia come una formula prende l'apostrofo", () => {
    expect(sanitizeCell("=HYPERLINK(\"x\")")).toBe("'=HYPERLINK(\"x\")")
    expect(sanitizeCell("+39 333")).toBe("'+39 333")
    expect(sanitizeCell("-Rossi")).toBe("'-Rossi")
    expect(sanitizeCell("@cmd")).toBe("'@cmd")
  })

  it("testi normali, numeri e date restano com'erano", () => {
    expect(sanitizeCell("Maria Rossi")).toBe("Maria Rossi")
    expect(sanitizeCell(-40)).toBe(-40)
    expect(sanitizeCell(0)).toBe(0)
    const d = new Date("2026-10-07T00:00:00.000Z")
    expect(sanitizeCell(d)).toBe(d)
    expect(sanitizeCell(null)).toBeNull()
  })
})
