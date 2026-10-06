import { describe, expect, it } from "vitest"

import { isBelowLg, LG_BREAKPOINT } from "./use-is-below-lg"

describe("soglia della barra laterale", () => {
  it("1023 px sta sotto, 1024 px sta sopra", () => {
    expect(isBelowLg(1023)).toBe(true)
    expect(isBelowLg(1024)).toBe(false)
  })

  it("i formati che usa Giuseppina", () => {
    // iPad verticale e orizzontale: il verticale non deve avere la barra fissa
    expect(isBelowLg(820)).toBe(true)
    expect(isBelowLg(1180)).toBe(false)
    // iPhone e MacBook
    expect(isBelowLg(390)).toBe(true)
    expect(isBelowLg(1440)).toBe(false)
  })

  it("la soglia è quella di Tailwind", () => {
    expect(LG_BREAKPOINT).toBe(1024)
  })
})
