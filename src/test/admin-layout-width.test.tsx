import fs from "node:fs"
import path from "node:path"

import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { scrollFadeMask } from "@/components/scroll-fade"
import { SidebarInset } from "@/components/ui/sidebar"

// ─────────────────────────────────────────────────────────────────────────
// La pagina non deve mai allargarsi oltre la finestra.
//
// A 1440 con la sidebar aperta Allieve misurava 1451 px e Pagamenti 1592:
// <main> è un figlio flex accanto alla sidebar e, senza `min-w-0`, un figlio
// flex non scende sotto la larghezza minima del suo contenuto. Bastava una
// riga con un testo che non va a capo per allargare tutta la pagina.
//
// Qui non c'è un motore di layout (niente jsdom, vedi CLAUDE.md): le
// larghezze vere si misurano nel browser (scrollWidth === larghezza della
// finestra, vedi la PR). Questo test tiene ferma la CAUSA: ogni anello della
// catena flex fra la sidebar e il contenuto deve poter restringersi.
// ─────────────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, "../..")
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8")

function classesOf(markup: string, tag: string): string[] {
  const match = new RegExp(`<${tag}[^>]*class="([^"]*)"`).exec(markup)
  return match ? match[1].split(/\s+/) : []
}

describe("catena flex dell'area admin", () => {
  it("<main> (SidebarInset) è flex-1 e può restringersi: min-w-0", () => {
    const classes = classesOf(renderToStaticMarkup(<SidebarInset>x</SidebarInset>), "main")
    expect(classes).toContain("flex-1")
    expect(classes).toContain("min-w-0")
  })

  it("il contenitore delle pagine nel layout admin ha min-w-0", () => {
    const layout = read("src/app/(admin)/layout.tsx")
    const wrapper = /<div className="([^"]*)">\{children\}<\/div>/.exec(layout)
    expect(wrapper, "wrapper di {children} non trovato").not.toBeNull()
    const classes = wrapper![1].split(/\s+/)
    expect(classes).toContain("flex-1")
    expect(classes).toContain("min-w-0")
  })

  it("le griglie a due colonne di scheda allieva e bilancio non usano tracce `1fr` nude", () => {
    // `1fr` = minmax(auto, 1fr): la traccia non scende sotto il contenuto.
    // Sul telefono è così che la colonna «%» usciva dal riquadro.
    const files = [
      "src/app/(admin)/admin/athletes/[id]/_components/athlete-overview.tsx",
      "src/app/(admin)/admin/reports/bilancio/_components/bilancio-entrate-section.tsx",
      "src/app/(admin)/admin/reports/bilancio/_components/bilancio-uscite-section.tsx",
    ]
    for (const file of files) {
      const source = read(file)
      // grid-cols-1 di Tailwind è repeat(1, minmax(0, 1fr)): si restringe
      expect(source, file).toMatch(/"grid grid-cols-1 /)
      expect(source, file).not.toMatch(/grid-cols-\[1fr/)
    }
  })

  it("le schede scorrono dentro ScrollFade, non nella pagina", () => {
    for (const file of [
      "src/app/(admin)/admin/athletes/[id]/_components/athlete-tabs.tsx",
      "src/app/(admin)/admin/settings/_components/settings-nav.tsx",
    ]) {
      expect(read(file), file).toContain("<ScrollFade")
    }
  })
})

describe("dissolvenza delle righe che scorrono", () => {
  it("nessuna maschera se non c'è altro da vedere", () => {
    expect(scrollFadeMask({ left: false, right: false })).toBeUndefined()
  })

  it("sfuma solo il bordo dove c'è altro", () => {
    const right = scrollFadeMask({ left: false, right: true })!
    expect(right).toContain("transparent 100%")
    expect(right).toContain("#000 0")
    const left = scrollFadeMask({ left: true, right: false })!
    expect(left).toContain("transparent 0")
    expect(left).toContain("#000 100%")
    const both = scrollFadeMask({ left: true, right: true })!
    expect(both).toContain("transparent 0")
    expect(both).toContain("transparent 100%")
  })
})
