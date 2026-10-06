import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { BilancioSummary } from "./bilancio-summary"

const totals = (entrateCents: number, usciteCents: number) => ({
  entrateCents,
  usciteCents,
  netCents: entrateCents - usciteCents,
  countEntrate: 3,
  countUscite: 2,
})

const text = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/ /g, " ").replace(/\s+/g, " ")

describe("BilancioSummary", () => {
  it("entrate sopra le uscite: avanzo di gestione", () => {
    const out = text(
      renderToStaticMarkup(<BilancioSummary totals={totals(250000, 100000)} />),
    )
    expect(out).toContain("Avanzo di gestione")
    expect(out).toContain("1.500,00 €")
    expect(out).not.toContain("Disavanzo")
  })

  it("uscite sopra le entrate: disavanzo, con l'importo senza il meno", () => {
    const out = text(
      renderToStaticMarkup(<BilancioSummary totals={totals(100000, 112000)} />),
    )
    expect(out).toContain("Disavanzo di gestione")
    expect(out).toContain("120,00 €")
    expect(out).not.toContain("-120,00")
  })

  it("niente «Saldo netto» e niente margine in percentuale", () => {
    const out = text(
      renderToStaticMarkup(<BilancioSummary totals={totals(250000, 100000)} />),
    )
    expect(out).not.toContain("Saldo netto")
    expect(out).not.toContain("Margine")
    expect(out).not.toContain("%")
  })
})
