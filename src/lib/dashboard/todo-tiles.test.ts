import { describe, expect, it } from "vitest"

import { ADMIN_NAV_ITEMS } from "@/app/(admin)/_components/admin-nav"

import {
  navCounters,
  todoSections,
  todoTiles,
  type TodoCounters,
} from "./todo-tiles"

const ZERO: TodoCounters = {
  scadenzeInRitardo: { count: 0, amountCents: 0 },
  inScadenza7gg: 0,
  pagamentiSenzaRicevuta: 0,
  ricevuteDaConsegnare: 0,
  genitoriSenzaAccesso: 0,
  allieveSenzaGenitore: 0,
  allieveSenzaCorso: 0,
  allieveSenzaEmail: 0,
  allieveSenzaPrivacy: 0,
  certificatiScaduti: 0,
  certificatiInScadenza: 0,
  certificatiAssenti: 0,
  tessereDaFare: { count: 0, seasonYear: 2026 },
}

// Tutti i contatori accesi: serve a fissare l'ordine dei riquadri e i toni
const TUTTI: Partial<TodoCounters> = {
  scadenzeInRitardo: { count: 2, amountCents: 8000 },
  pagamentiSenzaRicevuta: 1,
  ricevuteDaConsegnare: 49,
  genitoriSenzaAccesso: 7,
  allieveSenzaGenitore: 8,
  allieveSenzaCorso: 1,
  allieveSenzaEmail: 3,
  allieveSenzaPrivacy: 5,
  certificatiScaduti: 2,
  certificatiInScadenza: 4,
  certificatiAssenti: 50,
  tessereDaFare: { count: 20, seasonYear: 2026 },
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

  it("ordine fisso: prima quello che blocca, poi quello da sistemare", () => {
    expect(ids(TUTTI)).toEqual([
      "certificati-scaduti",
      "certificati-assenti",
      "tessere-da-fare",
      "allieve-senza-genitore",
      "scadenze-in-ritardo",
      "pagamenti-senza-ricevuta",
      "ricevute-da-consegnare",
      "allieve-senza-corso",
      "allieve-senza-email",
      "allieve-senza-privacy",
      "genitori-senza-accesso",
      "certificati-in-scadenza",
    ])
  })

  it("rosso solo su ciò che blocca", () => {
    const tiles = todoTiles({ ...ZERO, ...TUTTI })
    const blocca = tiles.filter((t) => t.tone === "block").map((t) => t.id)
    expect(blocca).toEqual([
      "certificati-scaduti",
      "certificati-assenti",
      "tessere-da-fare",
      "allieve-senza-genitore",
    ])
    // Tutto il resto è ambra: nessun riquadro resta senza tono
    const altri = tiles.filter((t) => t.tone !== "block")
    expect(altri.every((t) => t.tone === "fix")).toBe(true)
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
    const tiles = todoTiles({ ...ZERO, ...TUTTI })
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

describe("todoSections", () => {
  it("salta la sezione senza riquadri", () => {
    const tiles = todoTiles({ ...ZERO, certificatiAssenti: 5 })
    expect(todoSections(tiles).map((s) => s.id)).toEqual(["block"])

    const soloDaSistemare = todoTiles({ ...ZERO, genitoriSenzaAccesso: 3 })
    expect(todoSections(soloDaSistemare).map((s) => s.id)).toEqual(["fix"])
  })

  it("due sezioni, «Blocca qualcosa» per prima", () => {
    const sections = todoSections(todoTiles({ ...ZERO, ...TUTTI }))
    expect(sections.map((s) => s.title)).toEqual([
      "Blocca qualcosa",
      "Da sistemare",
    ])
    expect(sections[0].tiles.map((t) => t.id)).toEqual([
      "certificati-scaduti",
      "certificati-assenti",
      "tessere-da-fare",
      "allieve-senza-genitore",
    ])
    expect(sections[1].tiles.map((t) => t.id)).toEqual([
      "scadenze-in-ritardo",
      "pagamenti-senza-ricevuta",
      "ricevute-da-consegnare",
      "allieve-senza-corso",
      "allieve-senza-email",
      "allieve-senza-privacy",
      "genitori-senza-accesso",
      "certificati-in-scadenza",
    ])
  })

  it("nessun riquadro resta fuori dalle due sezioni", () => {
    const tiles = todoTiles({ ...ZERO, ...TUTTI })
    const dentro = todoSections(tiles).flatMap((s) => s.tiles)
    expect(dentro).toHaveLength(tiles.length)
  })

  it("niente riquadri, niente sezioni", () => {
    expect(todoSections([])).toEqual([])
  })
})

describe("navCounters", () => {
  const INPUT = {
    scadenzeInRitardo: { count: 0, amountCents: 0 },
    ricevuteDaConsegnare: 0,
    certificatiScaduti: 0,
    certificatiAssenti: 0,
    tessereDaFare: { count: 0, seasonYear: 2026 },
  }

  it("niente da fare, nessun badge nel menu", () => {
    expect(navCounters(INPUT)).toEqual({})
  })

  it("le voci a zero non portano badge", () => {
    const counters = navCounters({
      ...INPUT,
      scadenzeInRitardo: { count: 28, amountCents: 103500 },
    })
    expect(Object.keys(counters)).toEqual(["/admin/scadenze"])
    expect(counters["/admin/scadenze"]).toEqual({ count: 28, tone: "fix" })
  })

  it("le ricevute da consegnare hanno il loro badge, in ambra", () => {
    const counters = navCounters({ ...INPUT, ricevuteDaConsegnare: 49 })
    expect(Object.keys(counters)).toEqual(["/admin/receipts"])
    expect(counters["/admin/receipts"]).toEqual({ count: 49, tone: "fix" })
  })

  it("certificati e tessere sono rossi, scadenze e ricevute ambra", () => {
    const counters = navCounters({
      ...INPUT,
      scadenzeInRitardo: { count: 2, amountCents: 100 },
      ricevuteDaConsegnare: 49,
      certificatiScaduti: 3,
      certificatiAssenti: 56,
      tessereDaFare: { count: 1, seasonYear: 2026 },
    })
    expect(counters["/admin/medical-certificates"]).toEqual({
      count: 59,
      tone: "block",
    })
    // Rosso dove manca la copertura per fare lezione: certificato e tessera
    const rossi = Object.entries(counters)
      .filter(([, c]) => c.tone === "block")
      .map(([href]) => href)
    expect(rossi).toEqual(["/admin/medical-certificates", "/admin/tessere"])
  })

  it("gli stessi numeri dei riquadri della dashboard", () => {
    // Stesso input dei riquadri: quello che il menu mostra è un
    // sottoinsieme, mai un conteggio diverso
    const todo: TodoCounters = {
      ...ZERO,
      scadenzeInRitardo: { count: 28, amountCents: 103500 },
      ricevuteDaConsegnare: 49,
      certificatiScaduti: 3,
      certificatiAssenti: 56,
      tessereDaFare: { count: 1, seasonYear: 2026 },
    }
    const tiles = todoTiles(todo)
    const menu = navCounters(todo)

    const tileCount = (id: string) =>
      tiles.find((t) => t.id === id)?.count ?? 0

    expect(menu["/admin/scadenze"].count).toBe(tileCount("scadenze-in-ritardo"))
    expect(menu["/admin/receipts"].count).toBe(
      tileCount("ricevute-da-consegnare"),
    )
    expect(menu["/admin/medical-certificates"].count).toBe(
      tileCount("certificati-scaduti") + tileCount("certificati-assenti"),
    )
    expect(menu["/admin/tessere"].count).toBe(tileCount("tessere-da-fare"))
  })

  it("ogni chiave è l'href di una voce del menu", () => {
    const counters = navCounters({
      scadenzeInRitardo: { count: 1, amountCents: 1 },
      ricevuteDaConsegnare: 1,
      certificatiScaduti: 1,
      certificatiAssenti: 0,
      tessereDaFare: { count: 1, seasonYear: 2026 },
    })
    const hrefs = ADMIN_NAV_ITEMS.map((i) => i.href)
    for (const key of Object.keys(counters)) {
      expect(hrefs, key).toContain(key)
    }
  })
})
