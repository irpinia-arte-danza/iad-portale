import { afterEach, describe, expect, it, vi } from "vitest"

import { dateOnly } from "@/lib/utils/date-only"

import {
  CERT_EXPIRY_WARNING_DAYS,
  classifyCert,
  compareByCertificateExpiry,
  compareCurrentFirst,
  daysUntilExpiry,
} from "./certificate-status"

// Oggi: 15/09/2026
const today = dateOnly(2026, 8, 15)
const inDays = (n: number) => dateOnly(2026, 8, 15 + n)

describe("classifyCert", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("nessun certificato → mancante", () => {
    expect(classifyCert(null, today)).toBe("missing")
    expect(classifyCert(undefined, today)).toBe("missing")
  })

  it("scade oggi → in scadenza, non scaduto", () => {
    expect(classifyCert(today, today)).toBe("expiring")
  })

  it("scaduto ieri → scaduto", () => {
    expect(classifyCert(inDays(-1), today)).toBe("expired")
  })

  it("entro 30 giorni → in scadenza, dal 31° → valido", () => {
    expect(CERT_EXPIRY_WARNING_DAYS).toBe(30)
    expect(classifyCert(inDays(30), today)).toBe("expiring")
    expect(classifyCert(inDays(31), today)).toBe("valid")
  })

  it("una scadenza di oggi non risulta scaduta alle 14:00 di Roma", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-15T12:00:00Z")) // 14:00 a Roma
    expect(classifyCert(dateOnly(2026, 8, 15))).toBe("expiring")
  })

  it("usa il giorno di Roma anche a cavallo della mezzanotte UTC", () => {
    vi.useFakeTimers()
    // 00:30 del 15/09 a Roma, ancora 14/09 in UTC
    vi.setSystemTime(new Date("2026-09-14T22:30:00Z"))
    expect(classifyCert(dateOnly(2026, 8, 14))).toBe("expired")
    expect(classifyCert(dateOnly(2026, 8, 15))).toBe("expiring")
  })
})

describe("daysUntilExpiry", () => {
  it("conta giorni di calendario", () => {
    expect(daysUntilExpiry(today, today)).toBe(0)
    expect(daysUntilExpiry(inDays(5), today)).toBe(5)
    expect(daysUntilExpiry(inDays(-3), today)).toBe(-3)
  })

  it("non sbaglia col cambio dell'ora legale", () => {
    // L'ora legale finisce il 25/10/2026
    expect(daysUntilExpiry(dateOnly(2026, 9, 30), dateOnly(2026, 9, 20))).toBe(
      10,
    )
  })
})

describe("compareCurrentFirst", () => {
  const cert = (id: string, expiryDate: Date, createdAt: Date) => ({
    id,
    expiryDate,
    createdAt,
  })

  it("un rinnovo con scadenza più lontana diventa il corrente", () => {
    const old = cert("old", dateOnly(2026, 9, 1), dateOnly(2025, 9, 1))
    const renewed = cert("new", dateOnly(2027, 9, 1), dateOnly(2026, 8, 20))
    expect([old, renewed].sort(compareCurrentFirst).map((c) => c.id)).toEqual([
      "new",
      "old",
    ])
  })

  it("conta la scadenza, non l'ordine di inserimento", () => {
    // Inserito dopo, ma con scadenza precedente (es. storico caricato tardi)
    const current = cert("a", dateOnly(2027, 5, 1), dateOnly(2026, 8, 1))
    const lateUpload = cert("b", dateOnly(2025, 5, 1), dateOnly(2026, 8, 10))
    expect([lateUpload, current].sort(compareCurrentFirst)[0].id).toBe("a")
  })

  it("a parità di scadenza vale l'ultimo inserito", () => {
    const first = cert("first", dateOnly(2027, 0, 1), dateOnly(2026, 0, 1))
    const second = cert("second", dateOnly(2027, 0, 1), dateOnly(2026, 0, 2))
    expect([first, second].sort(compareCurrentFirst)[0].id).toBe("second")
  })
})

describe("compareByCertificateExpiry", () => {
  it("prima le allieve senza certificato, poi per scadenza crescente", () => {
    const rows = [
      { name: "valido", expiry: inDays(200) },
      { name: "mancante", expiry: null },
      { name: "scaduto", expiry: inDays(-10) },
      { name: "in scadenza", expiry: inDays(5) },
    ]
    rows.sort((a, b) => compareByCertificateExpiry(a.expiry, b.expiry))
    expect(rows.map((r) => r.name)).toEqual([
      "mancante",
      "scaduto",
      "in scadenza",
      "valido",
    ])
  })
})
