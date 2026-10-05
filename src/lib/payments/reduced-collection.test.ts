import { describe, expect, it } from "vitest"

import {
  isAmountOffReference,
  monthBadge,
  raisedRows,
  reducedRows,
} from "./reduced-collection"

const riga = (
  id: string,
  amountCents: number,
  collectedCents: number,
  description = id,
) => ({ id, description, amountCents, collectedCents })

describe("reducedRows", () => {
  it("prende solo le righe incassate per meno del dovuto", () => {
    const r = reducedRows([
      riga("ass", 3000, 3000),
      riga("set", 4000, 2000),
      riga("ott", 4000, 4000),
    ])
    expect(r.map((x) => x.id)).toEqual(["set"])
    expect(r[0]).toMatchObject({ fromCents: 4000, toCents: 2000 })
  })

  it("ignora le righe a zero: le rifiuta già planCollection", () => {
    expect(reducedRows([riga("set", 4000, 0)])).toEqual([])
  })

  it("ignora le righe oltre il dovuto", () => {
    expect(reducedRows([riga("set", 4000, 5000)])).toEqual([])
  })

  it("elenca tutte le righe ridotte, non solo la prima", () => {
    const r = reducedRows([riga("set", 4000, 2000), riga("ott", 4000, 1000)])
    expect(r.map((x) => x.id)).toEqual(["set", "ott"])
  })

  it("nessuna riga ridotta: elenco vuoto", () => {
    expect(reducedRows([riga("ass", 3000, 3000)])).toEqual([])
  })
})

describe("monthBadge", () => {
  it("distingue settembre da ottobre, che è il punto", () => {
    expect(monthBadge(new Date("2026-09-10T00:00:00.000Z"))).toBe("SET")
    expect(monthBadge(new Date("2026-10-10T00:00:00.000Z"))).toBe("OTT")
  })

  it("copre i dodici mesi", () => {
    const sigle = Array.from({ length: 12 }, (_, m) =>
      monthBadge(new Date(Date.UTC(2026, m, 10))),
    )
    expect(sigle).toEqual([
      "GEN", "FEB", "MAR", "APR", "MAG", "GIU",
      "LUG", "AGO", "SET", "OTT", "NOV", "DIC",
    ])
  })

  it("legge il mese in UTC, come sono salvate le scadenze", () => {
    // Mezzanotte UTC del 1° ottobre: a Roma è già il 1° ottobre alle 02:00,
    // ma il mese non deve dipendere dal fuso di chi guarda
    expect(monthBadge(new Date("2026-10-01T00:00:00.000Z"))).toBe("OTT")
  })
})

describe("isAmountOffReference", () => {
  it("segnala la scadenza non pagata con importo diverso dalla quota", () => {
    expect(
      isAmountOffReference({
        amountCents: 2000,
        referenceAmountCents: 4000,
        isPaid: false,
      }),
    ).toBe(true)
  })

  it("non segnala quando l'importo coincide", () => {
    expect(
      isAmountOffReference({
        amountCents: 4000,
        referenceAmountCents: 4000,
        isPaid: false,
      }),
    ).toBe(false)
  })

  it("non segnala le pagate: lì l'importo è quanto è stato incassato", () => {
    expect(
      isAmountOffReference({
        amountCents: 2000,
        referenceAmountCents: 4000,
        isPaid: true,
      }),
    ).toBe(false)
  })

  it("non segnala dove un riferimento non esiste", () => {
    expect(
      isAmountOffReference({
        amountCents: 2000,
        referenceAmountCents: null,
        isPaid: false,
      }),
    ).toBe(false)
  })
})

describe("raisedRows", () => {
  it("prende le righe incassate per più di quanto la scadenza chiedeva", () => {
    const r = raisedRows([
      riga("ass", 3000, 3000),
      riga("ott", 2000, 4000, "ottobre"),
    ])
    expect(r.map((x) => x.id)).toEqual(["ott"])
    expect(r[0]).toMatchObject({ fromCents: 2000, toCents: 4000 })
  })

  it("prende anche un rialzo parziale", () => {
    const r = raisedRows([riga("ott", 2000, 3000)])
    expect(r[0]).toMatchObject({ fromCents: 2000, toCents: 3000 })
  })

  it("ignora le righe esatte e quelle ridotte", () => {
    expect(
      raisedRows([riga("a", 4000, 4000), riga("b", 4000, 2000)]),
    ).toEqual([])
  })

  it("ridotte e rialzate non si sovrappongono mai", () => {
    const righe = [
      riga("giu", 4000, 2000),
      riga("ott", 2000, 4000),
      riga("ass", 3000, 3000),
    ]
    const ridotte = reducedRows(righe).map((r) => r.id)
    const rialzate = raisedRows(righe).map((r) => r.id)
    expect(ridotte).toEqual(["giu"])
    expect(rialzate).toEqual(["ott"])
    expect(ridotte.filter((id) => rialzate.includes(id))).toEqual([])
  })
})
