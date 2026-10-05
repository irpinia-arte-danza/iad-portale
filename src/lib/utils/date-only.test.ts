import { describe, expect, it } from "vitest"

import { dateOnly, toDateOnly, todayDateOnly } from "./date-only"

const iso = (d: Date) => d.toISOString()

describe("date di calendario", () => {
  it("di notte il giorno è quello di Roma, non quello UTC", () => {
    // 00:30 del 6 ottobre a Roma (ora estiva, UTC+2) sono le 22:30 del 5 UTC:
    // chi guardava il giorno UTC lavorava con la data di ieri fino alle 2
    expect(iso(todayDateOnly(new Date("2026-10-05T22:30:00.000Z")))).toBe(
      "2026-10-06T00:00:00.000Z",
    )
    // D'inverno (UTC+1) il giorno gira alle 23:00 UTC
    expect(iso(todayDateOnly(new Date("2027-01-10T23:30:00.000Z")))).toBe(
      "2027-01-11T00:00:00.000Z",
    )
  })

  it("di giorno il giorno è quello che è", () => {
    expect(iso(todayDateOnly(new Date("2026-10-05T09:00:00.000Z")))).toBe(
      "2026-10-05T00:00:00.000Z",
    )
  })

  it("è idempotente sulle date lette dal DB", () => {
    const fromDb = dateOnly(2026, 9, 5)
    expect(iso(toDateOnly(fromDb))).toBe(iso(fromDb))
  })

  it("una mezzanotte locale di Roma non scivola al giorno prima", () => {
    // Quello che arriva da <input type="date"> interpretato in locale
    expect(iso(toDateOnly(new Date("2026-10-05T00:00:00+02:00")))).toBe(
      "2026-10-05T00:00:00.000Z",
    )
  })
})
