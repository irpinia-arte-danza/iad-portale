import { describe, expect, it } from "vitest"

import { todoGroups, todoTiles, type TodoCounters } from "./todo-tiles"

const ZERO: TodoCounters = {
  scadenzeInRitardo: { count: 0, amountCents: 0 },
  inScadenza7gg: 0,
  pagamentiSenzaRicevuta: 0,
  ricevuteDaConsegnare: 0,
  allieveSenzaGenitore: 0,
  allieveSenzaCorso: 0,
  allieveSenzaEmail: 0,
  certificatiScaduti: 0,
  certificatiInScadenza: 0,
  certificatiAssenti: 0,
  tessereDaFare: { count: 0, seasonYear: 2026 },
}

const ids = (c: Partial<TodoCounters>) =>
  todoTiles({ ...ZERO, ...c }).map((t) => t.id)

describe("todoTiles", () => {
  it("tutti a zero: nessun riquadro, e chi chiama mostra «Tutto in ordine»", () => {
    expect(todoTiles(ZERO)).toEqual([])
  })

  it("un contatore a zero non compare", () => {
    expect(ids({ certificatiScaduti: 3 })).toEqual(["certificati-scaduti"])
  })

  it("ordine fisso: incassi, allieve, documenti", () => {
    expect(
      ids({
        scadenzeInRitardo: { count: 2, amountCents: 8000 },
        pagamentiSenzaRicevuta: 1,
        ricevuteDaConsegnare: 49,
        allieveSenzaGenitore: 8,
        allieveSenzaCorso: 1,
        allieveSenzaEmail: 3,
        certificatiScaduti: 2,
        certificatiInScadenza: 4,
        certificatiAssenti: 50,
        tessereDaFare: { count: 20, seasonYear: 2026 },
      }),
    ).toEqual([
      "scadenze-in-ritardo",
      "pagamenti-senza-ricevuta",
      "ricevute-da-consegnare",
      "allieve-senza-genitore",
      "allieve-senza-corso",
      "allieve-senza-email",
      "certificati-scaduti",
      "certificati-in-scadenza",
      "certificati-assenti",
      "tessere-da-fare",
    ])
  })

  it("rosso solo su ciò che blocca", () => {
    const tiles = todoTiles({
      ...ZERO,
      scadenzeInRitardo: { count: 1, amountCents: 4000 },
      pagamentiSenzaRicevuta: 1,
      ricevuteDaConsegnare: 1,
      allieveSenzaGenitore: 1,
      allieveSenzaCorso: 1,
      allieveSenzaEmail: 1,
      certificatiScaduti: 1,
      certificatiInScadenza: 1,
      certificatiAssenti: 1,
      tessereDaFare: { count: 1, seasonYear: 2026 },
    })
    const rossi = tiles.filter((t) => t.tone === "red").map((t) => t.id)
    expect(rossi).toEqual([
      "scadenze-in-ritardo",
      "allieve-senza-genitore",
      "certificati-scaduti",
    ])
  })

  it("le scadenze in ritardo portano il totale in euro", () => {
    const [tile] = todoTiles({
      ...ZERO,
      scadenzeInRitardo: { count: 3, amountCents: 12000 },
    })
    expect(tile.amountCents).toBe(12000)
  })

  it("la riga «in scadenza» compare solo se maggiore di zero", () => {
    const conNota = todoTiles({
      ...ZERO,
      scadenzeInRitardo: { count: 1, amountCents: 4000 },
      inScadenza7gg: 12,
    })
    expect(conNota[0].note).toBe("+ 12 in scadenza entro 7 giorni")

    const senzaNota = todoTiles({
      ...ZERO,
      scadenzeInRitardo: { count: 1, amountCents: 4000 },
      inScadenza7gg: 0,
    })
    expect(senzaNota[0].note).toBeUndefined()
  })

  it("le scadenze in arrivo da sole non fanno comparire nulla: non sono un compito", () => {
    expect(ids({ inScadenza7gg: 40 })).toEqual([])
  })

  it("singolare e plurale", () => {
    expect(todoTiles({ ...ZERO, allieveSenzaGenitore: 1 })[0].label).toBe(
      "Minorenne senza genitore",
    )
    expect(todoTiles({ ...ZERO, allieveSenzaGenitore: 8 })[0].label).toBe(
      "Minorenni senza genitore",
    )
  })

  it("ogni riquadro ha un href che porta a un elenco filtrato", () => {
    const tiles = todoTiles({
      ...ZERO,
      scadenzeInRitardo: { count: 1, amountCents: 1 },
      pagamentiSenzaRicevuta: 1,
      ricevuteDaConsegnare: 1,
      allieveSenzaGenitore: 1,
      allieveSenzaCorso: 1,
      allieveSenzaEmail: 1,
      certificatiScaduti: 1,
      certificatiInScadenza: 1,
      certificatiAssenti: 1,
      tessereDaFare: { count: 1, seasonYear: 2026 },
    })
    for (const tile of tiles) {
      expect(tile.href.startsWith("/admin/"), tile.id).toBe(true)
      // o un filtro nell'URL, o un'ancora sull'elenco giusto della pagina
      expect(
        tile.href.includes("?") || tile.href.includes("#"),
        `${tile.id} non porta a un elenco preciso`,
      ).toBe(true)
    }
    // href unici: due riquadri non portano allo stesso elenco
    const hrefs = tiles.map((t) => t.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })
})

describe("todoGroups", () => {
  it("salta i gruppi senza riquadri", () => {
    const tiles = todoTiles({ ...ZERO, certificatiAssenti: 5 })
    expect(todoGroups(tiles).map((g) => g.group)).toEqual(["Documenti"])
  })

  it("mantiene l'ordine dei gruppi", () => {
    const tiles = todoTiles({
      ...ZERO,
      certificatiAssenti: 1,
      allieveSenzaCorso: 1,
      pagamentiSenzaRicevuta: 1,
    })
    expect(todoGroups(tiles).map((g) => g.group)).toEqual([
      "Incassi",
      "Allieve",
      "Documenti",
    ])
  })

  it("niente riquadri, niente gruppi", () => {
    expect(todoGroups([])).toEqual([])
  })
})
