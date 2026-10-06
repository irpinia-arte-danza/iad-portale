import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { YearNotice } from "./year-notice"

describe("YearNotice", () => {
  it("anno corrente: non compare niente", () => {
    expect(
      renderToStaticMarkup(
        <YearNotice selected="2026" current="2026" backHref="/admin/receipts" />,
      ),
    ).toBe("")
  })

  it("un altro anno: la fascia, con il link che riporta al corrente", () => {
    const html = renderToStaticMarkup(
      <YearNotice selected="2025" current="2026" backHref="/admin/receipts" />,
    )
    expect(html).toContain("Stai guardando il 2025")
    expect(html).toContain("Torna all")
    expect(html).toContain('href="/admin/receipts"')
  })

  it("vale anche per l'anno accademico", () => {
    const html = renderToStaticMarkup(
      <YearNotice
        selected="2025-2026"
        current="2026-2027"
        backHref="/admin/scadenze"
      />,
    )
    expect(html).toContain("Stai guardando il 2025-2026")
  })

  it("periodo a cavallo di due anni (nessun anno scelto): niente fascia", () => {
    expect(
      renderToStaticMarkup(
        <YearNotice selected={null} current="2026" backHref="/x" />,
      ),
    ).toBe("")
  })
})
