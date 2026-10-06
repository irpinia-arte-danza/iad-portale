import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ResponsiveList, type ListColumn } from "./responsive-list"

// Niente jsdom (vedi CLAUDE.md): si rende il markup e si guardano le classi,
// che è esattamente quello che decide cosa si vede a 375 e cosa a 768.

type Riga = { id: string; nome: string; stato: string; eta: number }

const ITEMS: Riga[] = [
  { id: "a", nome: "Rossi Maria", stato: "Attiva", eta: 12 },
  { id: "b", nome: "Verdi Anna", stato: "Sospesa", eta: 9 },
]

const COLUMNS: ListColumn<Riga>[] = [
  { key: "nome", header: "Nome", cell: (r) => <a href={`/x/${r.id}`}>{r.nome}</a> },
  { key: "stato", header: "Stato", cell: (r) => <span>{r.stato}</span> },
  { key: "eta", header: "Età", priority: "medium", cell: (r) => <span>{r.eta}</span> },
  { key: "note", header: "Note", priority: "low", cell: () => <span>—</span> },
]

function render(extra: Partial<Parameters<typeof ResponsiveList<Riga>>[0]> = {}) {
  return renderToStaticMarkup(
    <ResponsiveList
      label="Prova"
      items={ITEMS}
      getId={(r) => r.id}
      columns={COLUMNS}
      cardLines={(r) => [
        <span key="1">riga uno, stato {r.stato}</span>,
        <span key="2">riga due</span>,
        <span key="3">riga tre che non deve comparire</span>,
      ]}
      empty={{ title: "Vuoto", hint: "Niente qui" }}
      {...extra}
    />,
  )
}

describe("ResponsiveList", () => {
  it("senza righe mostra lo stato vuoto e nient'altro", () => {
    const html = renderToStaticMarkup(
      <ResponsiveList
        label="Prova"
        items={[]}
        getId={(r: Riga) => r.id}
        columns={COLUMNS}
        cardLines={() => []}
        empty={{ title: "Nessuna allieva", hint: "Aggiungi la prima" }}
      />,
    )
    expect(html).toContain("Nessuna allieva")
    expect(html).toContain("Aggiungi la prima")
    expect(html).not.toContain("Rossi Maria")
  })

  it("una riga sola nel DOM per elemento: niente copia tabella + card", () => {
    const html = render()
    expect(html.split("Rossi Maria")).toHaveLength(2)
    expect(html.match(/<li/g)).toHaveLength(ITEMS.length)
  })

  it("la prima colonna non si nasconde mai, le altre hanno la loro soglia", () => {
    const html = render()
    // Il nome: nessun "hidden" sulla sua cella
    expect(html).toMatch(/class="[^"]*flex[^"]*"><a href="\/x\/a">Rossi Maria/)
    // Stato: alta, compare da 768
    expect(html).toContain("hidden md:flex")
    // Età: media, da 1024. Note: bassa, da 1280
    expect(html).toContain("hidden lg:flex")
    expect(html).toContain("hidden xl:flex")
  })

  it("le righe di stato sono solo per la card, e al massimo due", () => {
    const html = render()
    expect(html).toContain("md:hidden")
    expect(html).toContain("riga uno, stato Attiva")
    expect(html).toContain("riga due")
    expect(html).not.toContain("riga tre che non deve comparire")
  })

  it("l'intestazione esiste solo da 768 in su", () => {
    const html = render()
    expect(html).toMatch(/class="hidden items-center[^"]*md:flex"/)
  })

  it("le azioni sono un nodo solo per riga, in fondo alla card", () => {
    const html = render({
      actions: (r) => <button type="button">azioni di {r.nome}</button>,
    })
    expect(html.split("azioni di Rossi Maria")).toHaveLength(2)
  })

  it("la checkbox compare solo sulle righe selezionabili", () => {
    const html = render({
      selection: {
        selectableIds: ["a"],
        selected: new Set(["a"]),
        onSelectedChange: () => {},
        rowLabel: (id) => `Seleziona ${id}`,
        selectAllLabel: "Seleziona tutte",
      },
    })
    expect(html).toContain('aria-label="Seleziona a"')
    expect(html).not.toContain('aria-label="Seleziona b"')
    // La riga selezionata si vede
    expect(html).toContain('data-state="selected"')
  })
})
