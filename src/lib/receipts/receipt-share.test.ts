import { describe, expect, it } from "vitest"

import {
  NEVER_SHARED,
  shareStateLabel,
  wasShared,
  type ReceiptShareState,
} from "./receipt-share"

const sharedOnce: ReceiptShareState = {
  lastSharedAt: new Date("2026-09-16T10:00:00.000Z"),
  shareCount: 1,
}

describe("stato della condivisione", () => {
  it("non condivisa finché non risulta nessuna condivisione", () => {
    expect(wasShared(NEVER_SHARED)).toBe(false)
    expect(shareStateLabel(NEVER_SHARED)).toBeNull()
  })

  it("dopo una condivisione riporta la data", () => {
    expect(wasShared(sharedOnce)).toBe(true)
    expect(shareStateLabel(sharedOnce)).toContain("16/09/2026")
  })

  // Il punto dell'etichetta: non deve far credere che sia arrivata a qualcuno
  it("dichiara che il destinatario non è noto", () => {
    const label = shareStateLabel(sharedOnce) ?? ""
    expect(label).toContain("dal gestionale")
    expect(label).toContain("destinatario non registrato")
  })

  it("con più condivisioni dice quante", () => {
    const label = shareStateLabel({ ...sharedOnce, shareCount: 3 }) ?? ""
    expect(label).toContain("3 volte")
  })

  it("con una sola condivisione non dice «1 volte»", () => {
    expect(shareStateLabel(sharedOnce)).not.toContain("volte")
  })
})
