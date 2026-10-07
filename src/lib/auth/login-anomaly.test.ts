import { describe, expect, it } from "vitest"

import { adminLoginCutoff, failureAlertDue, loginAnomalies } from "./login-anomaly"

describe("loginAnomalies", () => {
  it("dispositivo nuovo → avviso", () => {
    expect(loginAnomalies({ newDevice: true, country: "IT" })).toEqual(["new-device"])
  })

  it("stesso dispositivo dall'Italia → nessun avviso", () => {
    expect(loginAnomalies({ newDevice: false, country: "IT" })).toEqual([])
    expect(loginAnomalies({ newDevice: false, country: "it" })).toEqual([])
  })

  it("stesso dispositivo dalla Francia → avviso", () => {
    expect(loginAnomalies({ newDevice: false, country: "FR" })).toEqual(["foreign-country"])
  })

  it("dispositivo nuovo e paese estero → entrambi, in una sola email", () => {
    expect(loginAnomalies({ newDevice: true, country: "DE" })).toEqual(["new-device", "foreign-country"])
  })

  it("paese sconosciuto (header assente) non è estero", () => {
    expect(loginAnomalies({ newDevice: false, country: null })).toEqual([])
  })
})

describe("failureAlertDue: cinque falliti → una sola email", () => {
  const now = new Date("2026-10-07T21:00:00Z")
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000)

  it("al quinto fallimento nella finestra sì, al quarto e al sesto no", () => {
    const four = [8, 6, 4, 2].map(minutesAgo)
    expect(failureAlertDue(four, now)).toBe(false)
    const five = [...four, minutesAgo(0)]
    expect(failureAlertDue(five, now)).toBe(true)
    const six = [...five, minutesAgo(0)]
    expect(failureAlertDue(six, now)).toBe(false)
  })

  it("i fallimenti fuori dalla finestra di dieci minuti non contano", () => {
    const old = [40, 30, 25, 20].map(minutesAgo)
    expect(failureAlertDue([...old, minutesAgo(0)], now)).toBe(false)
    const recent = [9, 7, 5, 3].map(minutesAgo)
    expect(failureAlertDue([...old, ...recent, minutesAgo(0)], now)).toBe(true)
  })
})

describe("conservazione", () => {
  it("il taglio è 90 giorni prima", () => {
    const now = new Date("2026-10-07T03:00:00Z")
    expect(adminLoginCutoff(now).toISOString()).toBe("2026-07-09T03:00:00.000Z")
  })
})
