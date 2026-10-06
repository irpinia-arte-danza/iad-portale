import { describe, expect, it } from "vitest"

import {
  countPayers,
  groupByPayer,
  selectionLabel,
  type PayerKeyed,
} from "./payer-grouping"

const rata = (
  scheduleId: string,
  parentId: string | null,
  athleteId: string,
): PayerKeyed => ({ scheduleId, parentId, athleteId })

describe("solleciti raggruppati per famiglia", () => {
  it("due figlie e due mesi: una famiglia, quattro rate", () => {
    const items = [
      rata("s1", "mamma", "maria"),
      rata("s2", "mamma", "maria"),
      rata("s3", "mamma", "chiara"),
      rata("s4", "mamma", "chiara"),
    ]
    const groups = groupByPayer(items)
    expect(groups).toHaveLength(1)
    expect(groups[0].items).toHaveLength(4)
    expect(groups[0].parentId).toBe("mamma")
    expect(selectionLabel(items)).toBe("4 scadenze · 1 famiglia")
  })

  it("due famiglie: due gruppi", () => {
    const items = [
      rata("s1", "mamma", "maria"),
      rata("s2", "papa", "sofia"),
      rata("s3", "mamma", "chiara"),
      rata("s4", "papa", "sofia"),
    ]
    const groups = groupByPayer(items)
    expect(groups).toHaveLength(2)
    expect(groups.map((g) => g.items.length)).toEqual([2, 2])
    expect(selectionLabel(items)).toBe("4 scadenze · 2 famiglie")
  })

  it("un'allieva senza genitori è una famiglia a sé", () => {
    const items = [
      rata("s1", null, "adulta"),
      rata("s2", null, "adulta"),
      rata("s3", null, "altra-adulta"),
    ]
    expect(countPayers(items)).toBe(2)
    expect(groupByPayer(items)[0].items).toHaveLength(2)
  })

  it("lo stesso genitore su figlie diverse resta una famiglia sola", () => {
    expect(
      countPayers([rata("s1", "mamma", "maria"), rata("s2", "mamma", "chiara")]),
    ).toBe(1)
  })

  it("una rata sola", () => {
    expect(selectionLabel([rata("s1", "mamma", "maria")])).toBe(
      "1 scadenza · 1 famiglia",
    )
  })

  it("l'ordine della query si mantiene", () => {
    const groups = groupByPayer([
      rata("s1", "papa", "sofia"),
      rata("s2", "mamma", "maria"),
    ])
    expect(groups.map((g) => g.parentId)).toEqual(["papa", "mamma"])
  })
})
