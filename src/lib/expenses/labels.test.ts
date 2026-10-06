import { describe, expect, it } from "vitest"

import { expenseRecipientLabel } from "./labels"

describe("expenseRecipientLabel", () => {
  it("per un compenso sportivo chi riceve è il percettore", () => {
    expect(expenseRecipientLabel("COMPENSATION")).toBe("Percettore")
  })

  it("per tutto il resto è un fornitore", () => {
    for (const type of ["RENT", "UTILITY", "TAX_F24", "MATERIAL", "OTHER"] as const) {
      expect(expenseRecipientLabel(type), type).toBe("Fornitore")
    }
  })

  it("prima di scegliere il tipo: fornitore", () => {
    expect(expenseRecipientLabel(undefined)).toBe("Fornitore")
  })
})
