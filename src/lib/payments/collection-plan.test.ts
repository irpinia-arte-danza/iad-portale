import { describe, expect, it } from "vitest"

import {
  amountDifferences,
  collectionCapCents,
  eurToCents,
  planCollection,
  rowDirection,
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

// ─────────────────────────────────────────────────────────────────────────
// Tetto alzato alla quota del corso: il caso di una mensile rimasta a 20 €
// dopo un incasso ridotto poi annullato, che va reincassata a 40 €.
// ─────────────────────────────────────────────────────────────────────────

const OTTOBRE = {
  id: "ott",
  description: "Contributo mensile di ottobre 2026 — Moderno 2h",
  amountCents: 2000,
  referenceAmountCents: 4000,
}

describe("collectionCapCents", () => {
  it("è la quota del corso quando è più alta dell'importo della scadenza", () => {
    expect(collectionCapCents(OTTOBRE)).toBe(4000)
  })

  it("è l'importo della scadenza quando non c'è una quota di riferimento", () => {
    expect(
      collectionCapCents({ ...OTTOBRE, referenceAmountCents: null }),
    ).toBe(2000)
  })

  it("non riabbassa una scadenza alzata a mano sopra la quota", () => {
    expect(
      collectionCapCents({ ...OTTOBRE, amountCents: 5000 }),
    ).toBe(5000)
  })
})

describe("incasso fino alla quota del corso", () => {
  it("40 € su una scadenza a 20 con quota 40: passa, e la scadenza torna a 40", () => {
    const plan = planCollection({ schedules: [OTTOBRE], totalCents: 4000 })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.rows[0]).toMatchObject({
      dueCents: 2000,
      collectedCents: 4000,
      alignedCents: 4000,
    })
    expect(rowDirection(plan.rows[0])).toBe("raised")
  })

  it("30 € sulla stessa scadenza: la porta a 30, non a 40", () => {
    const plan = planCollection({ schedules: [OTTOBRE], totalCents: 3000 })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.rows[0].alignedCents).toBe(3000)
    expect(rowDirection(plan.rows[0])).toBe("raised")
  })

  it("41 € supera la quota del corso: blocco, e il messaggio nomina la quota", () => {
    const plan = planCollection({ schedules: [OTTOBRE], totalCents: 4100 })
    expect(plan.ok).toBe(false)
    if (plan.ok) return
    expect(plan.error).toContain("supera la quota del corso")
    expect(plan.error).toContain("40,00")
  })

  it("10 € resta un incasso ridotto, come prima", () => {
    const plan = planCollection({ schedules: [OTTOBRE], totalCents: 1000 })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.rows[0].alignedCents).toBe(1000)
    expect(rowDirection(plan.rows[0])).toBe("lowered")
  })

  it("senza quota di riferimento il blocco resta sull'importo della scadenza", () => {
    const plan = planCollection({
      schedules: [{ ...OTTOBRE, referenceAmountCents: null }],
      totalCents: 2500,
    })
    expect(plan.ok).toBe(false)
    if (plan.ok) return
    expect(plan.error).toContain("supera l'importo della scadenza")
  })

  it("il contributo di iscrizione non si può superare", () => {
    const plan = planCollection({
      schedules: [
        { id: "ass", description: "Contributo di iscrizione 2026/2027", amountCents: 3000 },
      ],
      totalCents: 3500,
    })
    expect(plan.ok).toBe(false)
  })
})

describe("più scadenze, riga per riga", () => {
  const CONTRIBUTO = {
    id: "ass",
    description: "Contributo di iscrizione 2026/2027",
    amountCents: 3000,
  }

  it("contributo pieno + ottobre riportata alla quota", () => {
    const plan = planCollection({
      schedules: [CONTRIBUTO, OTTOBRE],
      totalCents: 7000,
      rowCents: { ass: 3000, ott: 4000 },
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.rows.map(rowDirection)).toEqual(["exact", "raised"])
    expect(plan.totalCents).toBe(7000)
  })

  it("una riga oltre la sua quota blocca tutto il pagamento", () => {
    const plan = planCollection({
      schedules: [CONTRIBUTO, OTTOBRE],
      totalCents: 8000,
      rowCents: { ass: 3000, ott: 5000 },
    })
    expect(plan.ok).toBe(false)
    if (plan.ok) return
    expect(plan.error).toContain("ottobre")
  })

  it("il tetto di una riga non si applica all'altra", () => {
    // Il contributo resta a 3000 anche se ottobre può salire a 4000
    const plan = planCollection({
      schedules: [CONTRIBUTO, OTTOBRE],
      totalCents: 7500,
      rowCents: { ass: 3500, ott: 4000 },
    })
    expect(plan.ok).toBe(false)
    if (plan.ok) return
    expect(plan.error).toContain("Contributo di iscrizione")
  })
})
