import { describe, expect, it } from "vitest"

import {
  generateRecoveryCodes,
  normalizeRecoveryCode,
  RECOVERY_CODE_ALPHABET,
} from "./recovery-code-format"

describe("codici di recupero", () => {
  it("otto codici diversi, XXXX-XXXX, solo caratteri leggibili", () => {
    const codes = generateRecoveryCodes()
    expect(codes).toHaveLength(8)
    expect(new Set(codes).size).toBe(8)
    for (const c of codes) {
      expect(c).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/)
      for (const ch of c.replace("-", "")) expect(RECOVERY_CODE_ALPHABET).toContain(ch)
      expect(c).not.toMatch(/[01IO]/)
    }
  })

  it("la normalizzazione perdona minuscole, spazi e trattini", () => {
    expect(normalizeRecoveryCode("abcd efgh")).toBe("ABCD-EFGH")
    expect(normalizeRecoveryCode(" ABCD-EFGH ")).toBe("ABCD-EFGH")
    expect(normalizeRecoveryCode("abcdefgh")).toBe("ABCD-EFGH")
  })

  it("troppo corto o troppo lungo non è un codice", () => {
    expect(normalizeRecoveryCode("ABC-DEF")).toBeNull()
    expect(normalizeRecoveryCode("ABCDEFGHJ")).toBeNull()
    expect(normalizeRecoveryCode("")).toBeNull()
  })
})
