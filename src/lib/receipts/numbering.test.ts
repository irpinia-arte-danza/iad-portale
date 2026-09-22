import { describe, expect, it } from "vitest"

import { feeTypeToReceiptCategory } from "./numbering"

describe("feeTypeToReceiptCategory", () => {
  it("saggio e costumi hanno una numerazione propria", () => {
    expect(feeTypeToReceiptCategory("SHOWCASE_1")).toBe("SHOWCASE")
    expect(feeTypeToReceiptCategory("SHOWCASE_2")).toBe("SHOWCASE")
    expect(feeTypeToReceiptCategory("COSTUME")).toBe("COSTUME")
  })

  it("tutto il resto sta nella serie ordinaria", () => {
    expect(feeTypeToReceiptCategory("MONTHLY")).toBe("REGULAR")
    expect(feeTypeToReceiptCategory("ASSOCIATION")).toBe("REGULAR")
    expect(feeTypeToReceiptCategory("STAGE")).toBe("REGULAR")
  })
})
