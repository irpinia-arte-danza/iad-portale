import { describe, expect, it } from "vitest"

import {
  checkCancelEnrollment,
  splitSchedulesOnWithdrawal,
  sumCents,
  type RuleSchedule,
} from "./enrollment-rules"

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

function rata(
  id: string,
  dueDate: string,
  status: RuleSchedule["status"] = "DUE",
  amountCents = 5000,
): RuleSchedule {
  return { id, dueDate: d(dueDate), status, amountCents }
}

// Un anno tipo: mensili da ottobre a giugno
const ANNO = [
  rata("ott", "2026-10-10"),
  rata("nov", "2026-11-10"),
  rata("dic", "2026-12-10"),
  rata("gen", "2027-01-10"),
  rata("feb", "2027-02-10"),
  rata("mar", "2027-03-10"),
  rata("apr", "2027-04-10"),
  rata("mag", "2027-05-10"),
  rata("giu", "2027-06-10"),
]

describe("checkCancelEnrollment", () => {
  it("consente l'annullamento se nessuna rata è pagata", () => {
    const check = checkCancelEnrollment(ANNO)
    expect(check.ok).toBe(true)
    if (!check.ok) return
    expect(check.removable).toHaveLength(9)
  })

  it("blocca se una rata è pagata e dice di stornare prima", () => {
    const check = checkCancelEnrollment([
      ...ANNO.slice(1),
      rata("ott", "2026-10-10", "PAID"),
    ])
    expect(check.ok).toBe(false)
    if (check.ok) return
    expect(check.paidCount).toBe(1)
    expect(check.message).toContain("storna il pagamento")
  })

  it("il messaggio va al plurale con più rate pagate", () => {
    const check = checkCancelEnrollment([
      rata("ott", "2026-10-10", "PAID"),
      rata("nov", "2026-11-10", "PAID"),
      rata("dic", "2026-12-10"),
    ])
    expect(check.ok).toBe(false)
    if (check.ok) return
    expect(check.paidCount).toBe(2)
    expect(check.message).toContain("2 rate già pagate")
  })

  it("una rata condonata non blocca: si annulla con il resto", () => {
    const check = checkCancelEnrollment([
      rata("ott", "2026-10-10", "WAIVED"),
      rata("nov", "2026-11-10"),
    ])
    expect(check.ok).toBe(true)
    if (!check.ok) return
    expect(check.removable).toHaveLength(2)
  })

  it("una rata scaduta non blocca", () => {
    const check = checkCancelEnrollment([rata("ott", "2026-10-10", "OVERDUE")])
    expect(check.ok).toBe(true)
  })

  it("iscrizione senza rate: si annulla", () => {
    const check = checkCancelEnrollment([])
    expect(check.ok).toBe(true)
    if (!check.ok) return
    expect(check.removable).toEqual([])
  })
})

describe("splitSchedulesOnWithdrawal", () => {
  it("tiene i mesi frequentati e butta i successivi", () => {
    const { keep, remove } = splitSchedulesOnWithdrawal(ANNO, d("2027-01-20"))

    expect(keep.map((s) => s.id)).toEqual(["ott", "nov", "dic", "gen"])
    expect(remove.map((s) => s.id)).toEqual(["feb", "mar", "apr", "mag", "giu"])
  })

  it("il mese del ritiro resta dovuto anche se si ritira prima della scadenza", () => {
    // Ritiro il 5 marzo, la rata di marzo scade il 10: marzo l'ha frequentato
    const { keep, remove } = splitSchedulesOnWithdrawal(ANNO, d("2027-03-05"))

    expect(keep.map((s) => s.id)).toContain("mar")
    expect(remove.map((s) => s.id)).toEqual(["apr", "mag", "giu"])
  })

  it("il mese del ritiro resta dovuto anche l'ultimo giorno del mese", () => {
    const { keep } = splitSchedulesOnWithdrawal(ANNO, d("2027-03-31"))
    expect(keep.map((s) => s.id)).toContain("mar")
  })

  it("una rata pagata di un mese futuro non si tocca", () => {
    const conAnticipo = ANNO.map((s) =>
      s.id === "mag" ? { ...s, status: "PAID" as const } : s,
    )
    const { keep, remove } = splitSchedulesOnWithdrawal(
      conAnticipo,
      d("2027-01-20"),
    )

    expect(keep.map((s) => s.id)).toContain("mag")
    expect(remove.map((s) => s.id)).toEqual(["feb", "mar", "apr", "giu"])
  })

  it("ritiro dopo la fine dell'anno: non butta via niente", () => {
    const { keep, remove } = splitSchedulesOnWithdrawal(ANNO, d("2027-07-01"))
    expect(keep).toHaveLength(9)
    expect(remove).toEqual([])
  })

  it("ritiro prima della prima rata: le butta tutte", () => {
    const { keep, remove } = splitSchedulesOnWithdrawal(ANNO, d("2026-09-15"))
    expect(keep).toEqual([])
    expect(remove).toHaveLength(9)
  })

  it("cambio d'anno: dicembre e gennaio non si confondono", () => {
    const { keep, remove } = splitSchedulesOnWithdrawal(
      [rata("dic", "2026-12-10"), rata("gen", "2027-01-10")],
      d("2026-12-31"),
    )
    expect(keep.map((s) => s.id)).toEqual(["dic"])
    expect(remove.map((s) => s.id)).toEqual(["gen"])
  })
})

describe("sumCents", () => {
  it("somma gli importi", () => {
    expect(sumCents([rata("a", "2026-10-10", "DUE", 3000), rata("b", "2026-11-10", "DUE", 4500)])).toBe(7500)
  })

  it("elenco vuoto: zero", () => {
    expect(sumCents([])).toBe(0)
  })
})
