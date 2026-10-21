import { describe, expect, it } from "vitest"

import {
  formatMegabytes,
  tooLargeMessage,
  UPLOAD_MAX_BYTES,
  uploadSizeError,
} from "./upload-limits"

const MB = 1024 * 1024

describe("limite dei file", () => {
  it("è 4 MB", () => {
    expect(UPLOAD_MAX_BYTES).toBe(4 * MB)
  })

  it("i MB con la virgola, il decimale solo se serve", () => {
    expect(formatMegabytes(6 * MB)).toBe("6")
    expect(formatMegabytes(1.5 * MB)).toBe("1,5")
    expect(formatMegabytes(4.26 * MB)).toBe("4,3")
  })

  it("il messaggio dice quanto pesa e qual è il massimo", () => {
    expect(tooLargeMessage(6.2 * MB)).toBe(
      "File troppo grande (6,2 MB), massimo 4 MB",
    )
  })

  it("blocca sopra i 4 MB, lascia passare fino a 4 MB", () => {
    expect(uploadSizeError({ size: 4 * MB })).toBeNull()
    expect(uploadSizeError({ size: 4 * MB + 1 })).toBe(
      "File troppo grande (4 MB), massimo 4 MB",
    )
    expect(uploadSizeError({ size: 5 * MB })).toBe(
      "File troppo grande (5 MB), massimo 4 MB",
    )
  })
})
