import { describe, expect, it } from "vitest"

import type { ScheduleStatus } from "@prisma/client"

import { computeScheduleDisplayStatus } from "./schedule-status"

const giorno = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const rata = (dueDate: string, status: ScheduleStatus = "DUE") => ({
  status,
  dueDate: giorno(dueDate),
})

describe("stato di una rata nell'elenco della scheda", () => {
  const AT = new Date("2026-10-06T09:00:00.000Z")

  it("pagata e condonata non guardano la data", () => {
    expect(computeScheduleDisplayStatus(rata("2020-01-01", "PAID"), AT)).toBe("PAID")
    expect(computeScheduleDisplayStatus(rata("2020-01-01", "WAIVED"), AT)).toBe("WAIVED")
  })

  it("ieri in ritardo, oggi in scadenza, fra dieci giorni prossima", () => {
    expect(computeScheduleDisplayStatus(rata("2026-10-05"), AT)).toBe("OVERDUE")
    expect(computeScheduleDisplayStatus(rata("2026-10-06"), AT)).toBe("DUE")
    expect(computeScheduleDisplayStatus(rata("2026-10-12"), AT)).toBe("DUE")
    expect(computeScheduleDisplayStatus(rata("2026-10-13"), AT)).toBe("FUTURE")
  })

  it("alle 00:30 di Roma il giorno è già quello nuovo", () => {
    // 22:30 UTC del 5 ottobre = 00:30 del 6 a Roma (ora estiva)
    const notte = new Date("2026-10-05T22:30:00.000Z")
    expect(computeScheduleDisplayStatus(rata("2026-10-05"), notte)).toBe("OVERDUE")
    expect(computeScheduleDisplayStatus(rata("2026-10-06"), notte)).toBe("DUE")
  })

  it("mezz'ora prima, a Roma, è ancora ieri", () => {
    const sera = new Date("2026-10-05T21:30:00.000Z")
    expect(computeScheduleDisplayStatus(rata("2026-10-05"), sera)).toBe("DUE")
  })

  it("d'inverno il giorno gira alle 23 UTC", () => {
    expect(
      computeScheduleDisplayStatus(rata("2027-01-10"), new Date("2027-01-10T23:30:00.000Z")),
    ).toBe("OVERDUE")
    expect(
      computeScheduleDisplayStatus(rata("2027-01-10"), new Date("2027-01-10T22:30:00.000Z")),
    ).toBe("DUE")
  })
})
