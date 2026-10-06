import { describe, expect, it } from "vitest"

import { daysOverdue, dueLabel } from "./due-label"

// 6 ottobre 2026, metà mattina a Roma
const OGGI = new Date("2026-10-06T08:00:00.000Z")
const giorno = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

describe("etichetta della scadenza", () => {
  it("ieri: in ritardo da 1 giorno, in ambra", () => {
    expect(dueLabel(giorno("2026-10-05"), OGGI)).toEqual({
      text: "in ritardo da 1 giorno",
      tone: "fix",
      days: 1,
    })
  })

  it("oggi: scade oggi, in neutro", () => {
    expect(dueLabel(giorno("2026-10-06"), OGGI)).toEqual({
      text: "scade oggi",
      tone: "neutral",
      days: 0,
    })
  })

  it("domani: tra 1 giorno, in neutro", () => {
    expect(dueLabel(giorno("2026-10-07"), OGGI)).toEqual({
      text: "tra 1 giorno",
      tone: "neutral",
      days: -1,
    })
  })

  it("venticinque giorni fa", () => {
    expect(dueLabel(giorno("2026-09-11"), OGGI).text).toBe(
      "in ritardo da 25 giorni",
    )
  })

  it("a cavallo della mezzanotte di Roma il giorno è quello italiano", () => {
    const due = giorno("2026-10-05")
    // 00:30 del 6 ottobre a Roma (ora estiva) = 22:30 del 5 UTC: a Roma è
    // già il 6, quindi la rata di ieri è in ritardo da 1 giorno
    const notte = new Date("2026-10-05T22:30:00.000Z")
    expect(dueLabel(due, notte).text).toBe("in ritardo da 1 giorno")
    // Mezz'ora prima, a Roma, è ancora il 5: scade oggi
    const sera = new Date("2026-10-05T21:30:00.000Z")
    expect(dueLabel(due, sera).text).toBe("scade oggi")
  })

  it("d'inverno il giorno gira alle 23 UTC", () => {
    const due = giorno("2027-01-10")
    expect(dueLabel(due, new Date("2027-01-10T23:30:00.000Z")).days).toBe(1)
    expect(dueLabel(due, new Date("2027-01-10T22:30:00.000Z")).days).toBe(0)
  })

  it("l'ora della scadenza non sposta il conto dentro la stessa giornata", () => {
    // Le colonne @db.Date tornano sempre a mezzanotte UTC; se però arriva un
    // valore con l'ora, conta il giorno di Roma di quell'istante
    expect(daysOverdue(new Date("2026-10-05T00:00:00.000Z"), OGGI)).toBe(1)
    expect(daysOverdue(new Date("2026-10-05T10:00:00.000Z"), OGGI)).toBe(1)
    expect(daysOverdue(new Date("2026-10-05T21:59:00.000Z"), OGGI)).toBe(1)
    // 23:00 UTC del 5 ottobre a Roma è già l'1 di notte del 6: giorno dopo
    expect(daysOverdue(new Date("2026-10-05T23:00:00.000Z"), OGGI)).toBe(0)
  })
})
