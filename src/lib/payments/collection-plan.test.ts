import { describe, expect, it } from "vitest"

import {
  amountDifferences,
  eurToCents,
  planCollection,
  type CollectionSchedule,
} from "./collection-plan"

const september: CollectionSchedule = {
  id: "sep",
  amountCents: 4000,
  description: "Contributo mensile di settembre 2026",
}
const october: CollectionSchedule = {
  id: "oct",
  amountCents: 4000,
  description: "Contributo mensile di ottobre 2026",
}
const association: CollectionSchedule = {
  id: "assoc",
  amountCents: 3000,
  description: "Contributo di iscrizione 2026/2027",
}

describe("planCollection — una scadenza", () => {
  it("incasso ridotto: la scadenza si allinea a quanto incassato", () => {
    const plan = planCollection({ schedules: [september], totalCents: 2000 })
    expect(plan).toEqual({
      ok: true,
      totalCents: 2000,
      rows: [
        {
          scheduleId: "sep",
          description: "Contributo mensile di settembre 2026",
          dueCents: 4000,
          collectedCents: 2000,
          alignedCents: 2000,
        },
      ],
    })
  })

  it("incasso pieno: nessuna differenza", () => {
    const plan = planCollection({ schedules: [september], totalCents: 4000 })
    expect(plan.ok && plan.rows[0].alignedCents).toBe(4000)
    expect(plan.ok && amountDifferences(plan.rows)).toEqual([])
  })

  it("incasso oltre il dovuto: bloccato", () => {
    const plan = planCollection({ schedules: [september], totalCents: 6000 })
    expect(plan).toMatchObject({ ok: false })
    expect(!plan.ok && plan.error).toContain("Contributo mensile di settembre 2026")
  })

  it("incasso ridotto: finisce nell'audit come differenza", () => {
    const plan = planCollection({ schedules: [september], totalCents: 2000 })
    expect(plan.ok && amountDifferences(plan.rows)).toHaveLength(1)
  })

  it("incasso a zero: bloccato", () => {
    expect(planCollection({ schedules: [september], totalCents: 0 }).ok).toBe(false)
  })

  it("gli importi per riga non contano con una sola scadenza", () => {
    const plan = planCollection({
      schedules: [september],
      totalCents: 2500,
      rowCents: { sep: 1000 },
    })
    expect(plan.ok && plan.rows[0].collectedCents).toBe(2500)
  })
})

describe("planCollection — più scadenze", () => {
  it("una riga ridotta: allineata, il totale è la somma", () => {
    const plan = planCollection({
      schedules: [association, september],
      totalCents: 5000,
      rowCents: { assoc: 3000, sep: 2000 },
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.rows.map((r) => r.alignedCents)).toEqual([3000, 2000])
    expect(amountDifferences(plan.rows).map((r) => r.scheduleId)).toEqual(["sep"])
  })

  it("righe senza importo indicato: vale l'importo della scadenza", () => {
    const plan = planCollection({ schedules: [september, october], totalCents: 8000 })
    expect(plan.ok && plan.rows.map((r) => r.collectedCents)).toEqual([4000, 4000])
  })

  it("il totale deve coincidere con la somma delle righe", () => {
    const plan = planCollection({
      schedules: [september, october],
      totalCents: 8000,
      rowCents: { sep: 2000 },
    })
    expect(plan.ok).toBe(false)
  })

  it("una riga a zero: bloccato, va tolta dal pagamento", () => {
    const plan = planCollection({
      schedules: [september, october],
      totalCents: 4000,
      rowCents: { sep: 0 },
    })
    expect(plan).toMatchObject({ ok: false })
    expect(!plan.ok && plan.error).toContain("Contributo mensile di settembre 2026")
  })

  it("una riga oltre il dovuto: bloccato", () => {
    const plan = planCollection({
      schedules: [september, october],
      totalCents: 10000,
      rowCents: { sep: 6000, oct: 4000 },
    })
    expect(plan.ok).toBe(false)
  })
})

describe("eurToCents", () => {
  it("arrotonda i centesimi dei decimali", () => {
    expect(eurToCents(20)).toBe(2000)
    expect(eurToCents(19.99)).toBe(1999)
    expect(eurToCents(0.1 + 0.2)).toBe(30)
  })
})
