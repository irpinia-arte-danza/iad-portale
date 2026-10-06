import { describe, expect, it } from "vitest"

import { unreferencedConsentFiles } from "./shared-file"

describe("unreferencedConsentFiles", () => {
  it("stesso file su tre consensi: tolto uno, il file resta", () => {
    // Restano due righe che lo puntano (una magari nel Cestino)
    expect(
      unreferencedConsentFiles(["modulo.pdf"], ["modulo.pdf", "modulo.pdf"]),
    ).toEqual([])
  })

  it("tolte tutte e tre le righe, il file si può togliere una volta sola", () => {
    expect(
      unreferencedConsentFiles(["modulo.pdf", "modulo.pdf", "modulo.pdf"], []),
    ).toEqual(["modulo.pdf"])
  })

  it("consensi senza allegato non contano", () => {
    expect(unreferencedConsentFiles([null, "a.pdf"], [null, "b.pdf"])).toEqual([
      "a.pdf",
    ])
  })
})
