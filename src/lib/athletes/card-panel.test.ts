import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { athleteCardHref, opensInPanel, PANEL_WIDTH_PX } from "./card-panel"

describe("opensInPanel", () => {
  it("1023 px: pagina", () => {
    expect(opensInPanel(1023)).toBe(false)
  })

  it("1024 px: pannello", () => {
    expect(opensInPanel(1024)).toBe(true)
  })

  it("iPad verticale e telefono: pagina; iPad orizzontale e desktop: pannello", () => {
    expect(opensInPanel(375)).toBe(false)
    expect(opensInPanel(820)).toBe(false)
    expect(opensInPanel(1180)).toBe(true)
    expect(opensInPanel(1440)).toBe(true)
  })

  it("dove si apre il pannello, dietro resta abbastanza lista da riconoscerla", () => {
    expect(1024 - PANEL_WIDTH_PX).toBeGreaterThanOrEqual(300)
  })
})

describe("athleteCardHref", () => {
  it("l'indirizzo del pannello è quello della scheda", () => {
    expect(athleteCardHref("abc")).toBe("/admin/athletes/abc")
  })

  it("con la scheda scelta, nello stesso parametro che legge la pagina", () => {
    expect(athleteCardHref("abc", "contributi")).toBe(
      "/admin/athletes/abc?tab=contributi",
    )
    expect(athleteCardHref("abc", "documenti")).toBe(
      "/admin/athletes/abc?tab=documenti",
    )
  })

  it("la panoramica è il default e non si scrive", () => {
    expect(athleteCardHref("abc", "panoramica")).toBe("/admin/athletes/abc")
  })
})

// La scheda in 640 px a una colonna è stata provata nel browser (vedi PR).
// Qui si tiene il contratto che la rende vera: la variante `in-panel` esiste
// in globals.css, il pannello accende `data-panel`, e le due griglie a più
// colonne della scheda la usano. Un render vero dei componenti non si può
// fare in questo ambiente: importano server action.
describe("scheda in pannello: una colonna", () => {
  const read = (path: string) =>
    readFileSync(join(process.cwd(), path), "utf-8")
  const CARD = "src/app/(admin)/admin/athletes/[id]/_components"

  it("la variante in-panel è definita sull'attributo del pannello", () => {
    expect(read("src/app/globals.css")).toContain(
      "@custom-variant in-panel ([data-panel] &);",
    )
    expect(read(`${CARD}/athlete-panel-sheet.tsx`)).toContain('data-panel=""')
  })

  it("le griglie a più colonne della scheda tornano a una nel pannello", () => {
    for (const file of ["athlete-status-strip.tsx", "athlete-overview.tsx"]) {
      const source = read(`${CARD}/${file}`)
      const multiColumn = source.match(/(?:md|lg|xl):grid-cols-\d[^"]*/g) ?? []
      expect(multiColumn.length, file).toBeGreaterThan(0)
      for (const classes of multiColumn) {
        expect(classes, file).toContain("in-panel:grid-cols-1")
      }
    }
  })

  it("pagina e pannello rendono lo stesso componente", () => {
    const page = read("src/app/(admin)/admin/athletes/[id]/page.tsx")
    expect(page).toContain('variant="page"')
    for (const list of ["scadenze", "medical-certificates"]) {
      const panel = read(
        `src/app/(admin)/admin/${list}/@panel/(..)athletes/[id]/page.tsx`,
      )
      expect(panel, list).toContain("<AthleteCard")
      expect(panel, list).toContain('variant="panel"')
    }
  })
})
