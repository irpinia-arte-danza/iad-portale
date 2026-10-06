import { describe, expect, it } from "vitest"

import { firstCategoryWithItems } from "./categories"

const cat = (key: string, count: number) => ({ key, count })

describe("firstCategoryWithItems", () => {
  it("salta le categorie vuote: non si apre su Allieve se è vuota", () => {
    expect(
      firstCategoryWithItems([
        cat("athletes", 0),
        cat("parents", 0),
        cat("expenses", 3),
        cat("certs", 1),
      ]),
    ).toBe("expenses")
  })

  it("se la prima ha elementi resta la prima", () => {
    expect(firstCategoryWithItems([cat("athletes", 2), cat("parents", 5)])).toBe(
      "athletes",
    )
  })

  it("cestino vuoto del tutto: null, e la pagina mostra un solo stato vuoto", () => {
    expect(firstCategoryWithItems([cat("athletes", 0), cat("parents", 0)])).toBeNull()
    expect(firstCategoryWithItems([])).toBeNull()
  })
})
