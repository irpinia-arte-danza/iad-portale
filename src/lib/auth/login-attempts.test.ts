import { describe, expect, it } from "vitest"

import { blockedUntil } from "./login-attempts"

const NOW = new Date("2026-10-07T10:00:00.000Z")
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000)

describe("blockedUntil", () => {
  it("quattro falliti in dieci minuti: ancora libero", () => {
    expect(blockedUntil([4, 3, 2, 1].map(minutesAgo), NOW)).toBeNull()
  })

  it("cinque falliti in dieci minuti: bloccato per 15 minuti dall'ultimo", () => {
    const until = blockedUntil([9, 7, 5, 3, 1].map(minutesAgo), NOW)
    expect(until).toEqual(new Date(NOW.getTime() + 14 * 60_000))
  })

  it("cinque falliti ma spalmati su più di dieci minuti: libero", () => {
    expect(blockedUntil([30, 25, 20, 15, 1].map(minutesAgo), NOW)).toBeNull()
  })

  it("il blocco scade: 5 falliti finiti 16 minuti fa non contano più", () => {
    expect(blockedUntil([25, 24, 23, 22, 16].map(minutesAgo), NOW)).toBeNull()
    // …15 minuti meno un secondo fa, invece, sì (i cinque stanno in 9 minuti)
    const until = blockedUntil(
      [24, 23, 22, 21].map(minutesAgo).concat(new Date(NOW.getTime() - 15 * 60_000 + 1000)),
      NOW,
    )
    expect(until).toEqual(new Date(NOW.getTime() + 1000))
  })

  it("il sesto tentativo durante il blocco allunga il blocco", () => {
    const until = blockedUntil([6, 5, 4, 3, 2, 0].map(minutesAgo), NOW)
    expect(until).toEqual(new Date(NOW.getTime() + 15 * 60_000))
  })

  it("l'ordine di arrivo non conta", () => {
    expect(blockedUntil([1, 9, 3, 7, 5].map(minutesAgo), NOW)).toEqual(
      new Date(NOW.getTime() + 14 * 60_000),
    )
  })
})
