import { describe, expect, it } from "vitest"

import {
  formatDateLong,
  formatDayLongRome,
  formatEuro,
  formatEuroAxis,
} from "./format"

// Lo spazio prima del simbolo è un NBSP (U+00A0): Intl lo mette così, e i
// test lo normalizzano per restare leggibili
const eur = (cents: number) => formatEuro(cents).replace(/ /g, " ")

describe("formatEuro", () => {
  it("il separatore delle migliaia c'è già a quattro cifre", () => {
    // Senza useGrouping: true l'italiano stamperebbe "1035,00 €"
    expect(eur(103500)).toBe("1.035,00 €")
  })

  it("importi di tutti i giorni", () => {
    expect(eur(4000)).toBe("40,00 €")
    expect(eur(3000)).toBe("30,00 €")
    expect(eur(1050)).toBe("10,50 €")
  })

  it("zero si stampa, non diventa vuoto", () => {
    expect(eur(0)).toBe("0,00 €")
  })

  it("i centesimi ci sono sempre, due cifre", () => {
    expect(eur(1)).toBe("0,01 €")
    expect(eur(10)).toBe("0,10 €")
    expect(eur(99)).toBe("0,99 €")
  })

  it("negativo: segno meno davanti", () => {
    expect(eur(-103500)).toBe("-1.035,00 €")
    expect(eur(-4000)).toBe("-40,00 €")
  })

  it("importi grandi: un separatore per gruppo", () => {
    expect(eur(1234567890)).toBe("12.345.678,90 €")
  })
})

describe("formatEuroAxis", () => {
  const axis = (cents: number) => formatEuroAxis(cents).replace(/\u00a0/g, " ")

  it("le tacche di un asse: senza centesimi, con il separatore", () => {
    expect(axis(0)).toBe("0 €")
    expect(axis(50000)).toBe("500 €")
    expect(axis(100000)).toBe("1.000 €")
    expect(axis(150000)).toBe("1.500 €")
  })
})

describe("data lunga", () => {
  it("è in minuscolo, come si scrive in italiano: giorno, numero, mese, anno", () => {
    expect(formatDateLong(new Date("2026-10-01T00:00:00Z"))).toBe("giovedì 1 ottobre 2026")
    expect(formatDateLong(new Date("2026-01-05T00:00:00Z"))).toBe("lunedì 5 gennaio 2026")
  })

  it("senza anno per le intestazioni di oggi", () => {
    expect(formatDayLongRome(new Date("2026-10-08T10:00:00Z"))).toBe("giovedì 8 ottobre")
  })

  it("il giorno è quello di Roma, non quello del server", () => {
    // 23:30 UTC del 30 settembre è già il primo ottobre a Roma
    expect(formatDateLong(new Date("2026-09-30T23:30:00Z"))).toBe("giovedì 1 ottobre 2026")
  })
})
