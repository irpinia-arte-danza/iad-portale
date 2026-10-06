import { GraduationCap, Trash2 } from "lucide-react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { EmptyState } from "./empty-state"

describe("EmptyState", () => {
  it("con il tasto: icona, titolo, descrizione e l'azione", () => {
    const html = renderToStaticMarkup(
      <EmptyState
        icon={GraduationCap}
        title="Ancora nessuna insegnante"
        description="Vedono solo i loro corsi e segnano le presenze dal telefono"
        action={<button type="button">Aggiungi insegnante</button>}
      />,
    )
    expect(html).toContain("Ancora nessuna insegnante")
    expect(html).toContain("segnano le presenze dal telefono")
    expect(html).toContain("Aggiungi insegnante")
    // L'icona c'è, ed è decorativa
    expect(html).toContain("<svg")
    expect(html).toContain('aria-hidden="true"')
  })

  it("senza tasto: nessun contenitore vuoto al posto dell'azione", () => {
    const html = renderToStaticMarkup(
      <EmptyState
        icon={Trash2}
        title="Nessuna allieva nel cestino"
        description="Quello che elimini resta qui e si può ripristinare"
      />,
    )
    expect(html).toContain("Nessuna allieva nel cestino")
    expect(html).not.toContain("<button")
    expect(html).not.toContain("pt-1")
  })

  it("niente bordo tratteggiato: non deve sembrare una ricerca andata male", () => {
    const html = renderToStaticMarkup(
      <EmptyState icon={Trash2} title="Vuoto" description="Niente qui" />,
    )
    expect(html).not.toContain("border-dashed")
  })

  it("il titolo è un'intestazione, così chi legge con la voce lo trova", () => {
    const html = renderToStaticMarkup(
      <EmptyState icon={Trash2} title="Vuoto" description="Niente qui" />,
    )
    expect(html).toMatch(/<h2[^>]*>Vuoto<\/h2>/)
  })
})
