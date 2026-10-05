import { describe, expect, it } from "vitest"

import {
  defaultExpiryFromIssue,
  isDefaultExpiry,
  shouldRefillExpiry,
} from "./default-expiry"

describe("defaultExpiryFromIssue", () => {
  it("un anno dopo il rilascio", () => {
    expect(defaultExpiryFromIssue("2026-09-10")).toBe("2027-09-10")
  })

  it("31 dicembre", () => {
    expect(defaultExpiryFromIssue("2026-12-31")).toBe("2027-12-31")
  })

  it("1 gennaio", () => {
    expect(defaultExpiryFromIssue("2026-01-01")).toBe("2027-01-01")
  })

  it("il 29 febbraio diventa 28 febbraio", () => {
    expect(defaultExpiryFromIssue("2028-02-29")).toBe("2029-02-28")
  })

  it("il 28 febbraio resta 28 febbraio, anche verso un anno bisestile", () => {
    expect(defaultExpiryFromIssue("2027-02-28")).toBe("2028-02-28")
  })

  it("il 1 marzo non si confonde col 29 febbraio", () => {
    expect(defaultExpiryFromIssue("2028-03-01")).toBe("2029-03-01")
  })

  it("31 marzo: l'anno dopo marzo ha ancora 31 giorni", () => {
    expect(defaultExpiryFromIssue("2026-03-31")).toBe("2027-03-31")
  })

  it("stringa vuota o non valida: niente da proporre", () => {
    expect(defaultExpiryFromIssue("")).toBe("")
    expect(defaultExpiryFromIssue("10/09/2026")).toBe("")
    expect(defaultExpiryFromIssue("2026-13-01")).toBe("")
    expect(defaultExpiryFromIssue("2026-02-30")).toBe("")
    expect(defaultExpiryFromIssue("2027-02-29")).toBe("")
  })

  it("il fuso non sposta il giorno", () => {
    // La funzione lavora su stringhe e non chiama mai new Date(): il
    // risultato non può dipendere dal fuso del processo. Il controllo
    // esplicito serve perché due implementazioni precedenti usavano Date,
    // una delle quali in ora locale.
    const fusi = ["Europe/Rome", "UTC", "Pacific/Kiritimati", "Pacific/Niue"]
    const originale = process.env.TZ
    try {
      for (const tz of fusi) {
        process.env.TZ = tz
        expect(defaultExpiryFromIssue("2026-01-01")).toBe("2027-01-01")
        expect(defaultExpiryFromIssue("2026-12-31")).toBe("2027-12-31")
        expect(defaultExpiryFromIssue("2028-02-29")).toBe("2029-02-28")
      }
    } finally {
      process.env.TZ = originale
    }
  })
})

describe("isDefaultExpiry", () => {
  it("riconosce la scadenza calcolata", () => {
    expect(isDefaultExpiry("2026-09-10", "2027-09-10")).toBe(true)
  })

  it("non riconosce una scadenza scritta a mano", () => {
    expect(isDefaultExpiry("2026-09-10", "2027-03-01")).toBe(false)
  })

  it("una scadenza vuota non è quella calcolata", () => {
    expect(isDefaultExpiry("2026-09-10", "")).toBe(false)
  })

  it("senza rilascio non c'è nulla da riconoscere", () => {
    expect(isDefaultExpiry("", "2027-09-10")).toBe(false)
  })
})

describe("shouldRefillExpiry", () => {
  it("scadenza vuota: si compila", () => {
    expect(shouldRefillExpiry("2026-09-10", "")).toBe(true)
    expect(shouldRefillExpiry("", "")).toBe(true)
  })

  it("scadenza ancora quella calcolata: si ricalcola", () => {
    expect(shouldRefillExpiry("2026-09-10", "2027-09-10")).toBe(true)
  })

  it("scadenza scritta a mano: non si tocca", () => {
    expect(shouldRefillExpiry("2026-09-10", "2027-03-01")).toBe(false)
  })

  it("una scadenza a mano PRIMA del nuovo rilascio non si tocca comunque", () => {
    // È il caso che le due implementazioni precedenti sovrascrivevano
    expect(shouldRefillExpiry("2026-09-10", "2026-10-01")).toBe(false)
  })

  it("senza rilascio precedente, una scadenza già scritta resta", () => {
    expect(shouldRefillExpiry("", "2027-03-01")).toBe(false)
  })
})
