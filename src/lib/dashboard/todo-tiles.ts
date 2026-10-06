import { athleteStepHref } from "@/lib/athletes/list-filters"

// ─────────────────────────────────────────────────────────────────────────
// "Da fare": i riquadri della dashboard.
//
// Ogni riquadro è un numero e un posto dove andare, e il numero deve essere
// uguale alle righe dell'elenco che apre. Per questo qui non c'è nessun
// conteggio: arrivano già fatti da chi usa gli stessi predicati degli
// elenchi. Questa funzione decide solo cosa mostrare, in che ordine e di che
// colore.
//
// I contatori a zero non si mostrano: una dashboard piena di zeri si smette
// di leggere.
// ─────────────────────────────────────────────────────────────────────────

export type TodoGroup = "Incassi" | "Allieve" | "Documenti"

// rosso = blocca qualcosa (soldi non incassati, allieva che non può entrare
// in sala, famiglia irraggiungibile). ambra = da sistemare, non blocca.
export type TodoTone = "red" | "amber"

export type TodoTile = {
  id: string
  group: TodoGroup
  label: string
  count: number
  href: string
  tone: TodoTone
  // Totale in euro, solo dove il numero da solo non basta
  amountCents?: number
  // Riga piccola sotto il numero
  note?: string
}

export type TodoCounters = {
  scadenzeInRitardo: { count: number; amountCents: number }
  // Solo informativa, non è un riquadro: prima del 10 del mese sono quasi
  // tutte in scadenza
  inScadenza7gg: number
  pagamentiSenzaRicevuta: number
  // Ricevute emesse che non sono ancora arrivate alla famiglia: né email, né
  // condivise, né consegnate a mano
  ricevuteDaConsegnare: number
  allieveSenzaGenitore: number
  allieveSenzaCorso: number
  allieveSenzaEmail: number
  certificatiScaduti: number
  certificatiInScadenza: number
  certificatiAssenti: number
  // L'elenco "Da tesserare" è per anno sociale: il numero senza l'anno non
  // si capisce
  tessereDaFare: { count: number; seasonYear: number }
}

export const CERT_STATUS_HREF = {
  expired: "/admin/medical-certificates?status=expired",
  expiring: "/admin/medical-certificates?status=expiring",
  missing: "/admin/medical-certificates?status=missing",
} as const

export const SCADENZE_IN_RITARDO_HREF = "/admin/scadenze?stato=IN_RITARDO"
export const PAGAMENTI_SENZA_RICEVUTA_HREF = "/admin/payments?ricevuta=mancante"
export const RICEVUTE_DA_CONSEGNARE_HREF = "/admin/receipts?stato=da-consegnare"
// La pagina Tessere apre già con l'elenco da mandare al referente: l'ancora
// ci porta sopra senza inventare un filtro che non esiste
export const TESSERE_DA_FARE_HREF = "/admin/tessere#da-tesserare"

function plural(count: number, uno: string, molti: string): string {
  return count === 1 ? uno : molti
}

export function todoTiles(counters: TodoCounters): TodoTile[] {
  const tiles: TodoTile[] = []

  if (counters.scadenzeInRitardo.count > 0) {
    tiles.push({
      id: "scadenze-in-ritardo",
      group: "Incassi",
      label: plural(
        counters.scadenzeInRitardo.count,
        "Scadenza in ritardo",
        "Scadenze in ritardo",
      ),
      count: counters.scadenzeInRitardo.count,
      amountCents: counters.scadenzeInRitardo.amountCents,
      href: SCADENZE_IN_RITARDO_HREF,
      tone: "red",
      note:
        counters.inScadenza7gg > 0
          ? `+ ${counters.inScadenza7gg} in scadenza entro 7 giorni`
          : undefined,
    })
  }

  if (counters.pagamentiSenzaRicevuta > 0) {
    tiles.push({
      id: "pagamenti-senza-ricevuta",
      group: "Incassi",
      label: plural(
        counters.pagamentiSenzaRicevuta,
        "Pagamento senza ricevuta",
        "Pagamenti senza ricevuta",
      ),
      count: counters.pagamentiSenzaRicevuta,
      href: PAGAMENTI_SENZA_RICEVUTA_HREF,
      tone: "amber",
    })
  }

  if (counters.ricevuteDaConsegnare > 0) {
    tiles.push({
      id: "ricevute-da-consegnare",
      group: "Incassi",
      label: plural(
        counters.ricevuteDaConsegnare,
        "Ricevuta da consegnare",
        "Ricevute da consegnare",
      ),
      count: counters.ricevuteDaConsegnare,
      href: RICEVUTE_DA_CONSEGNARE_HREF,
      tone: "amber",
    })
  }

  if (counters.allieveSenzaGenitore > 0) {
    tiles.push({
      id: "allieve-senza-genitore",
      group: "Allieve",
      label: plural(
        counters.allieveSenzaGenitore,
        "Minorenne senza genitore",
        "Minorenni senza genitore",
      ),
      count: counters.allieveSenzaGenitore,
      href: athleteStepHref("guardian"),
      tone: "red",
    })
  }

  if (counters.allieveSenzaCorso > 0) {
    tiles.push({
      id: "allieve-senza-corso",
      group: "Allieve",
      label: "Senza corso quest'anno",
      count: counters.allieveSenzaCorso,
      href: athleteStepHref("course"),
      tone: "amber",
    })
  }

  if (counters.allieveSenzaEmail > 0) {
    tiles.push({
      id: "allieve-senza-email",
      group: "Allieve",
      label: plural(
        counters.allieveSenzaEmail,
        "Maggiorenne senza email",
        "Maggiorenni senza email",
      ),
      count: counters.allieveSenzaEmail,
      href: athleteStepHref("email"),
      tone: "amber",
    })
  }

  if (counters.certificatiScaduti > 0) {
    tiles.push({
      id: "certificati-scaduti",
      group: "Documenti",
      label: plural(
        counters.certificatiScaduti,
        "Certificato scaduto",
        "Certificati scaduti",
      ),
      count: counters.certificatiScaduti,
      href: CERT_STATUS_HREF.expired,
      tone: "red",
    })
  }

  if (counters.certificatiInScadenza > 0) {
    tiles.push({
      id: "certificati-in-scadenza",
      group: "Documenti",
      label: "Certificati in scadenza",
      count: counters.certificatiInScadenza,
      href: CERT_STATUS_HREF.expiring,
      tone: "amber",
    })
  }

  if (counters.certificatiAssenti > 0) {
    tiles.push({
      id: "certificati-assenti",
      group: "Documenti",
      label: "Certificati assenti",
      count: counters.certificatiAssenti,
      href: CERT_STATUS_HREF.missing,
      tone: "amber",
    })
  }

  if (counters.tessereDaFare.count > 0) {
    tiles.push({
      id: "tessere-da-fare",
      group: "Documenti",
      label: "Da tesserare",
      count: counters.tessereDaFare.count,
      href: TESSERE_DA_FARE_HREF,
      tone: "amber",
      note: `Anno sociale ${counters.tessereDaFare.seasonYear}`,
    })
  }

  return tiles
}

// Gruppi nell'ordine, con dentro solo i riquadri che si mostrano
export function todoGroups(
  tiles: TodoTile[],
): { group: TodoGroup; tiles: TodoTile[] }[] {
  const order: TodoGroup[] = ["Incassi", "Allieve", "Documenti"]
  return order
    .map((group) => ({ group, tiles: tiles.filter((t) => t.group === group) }))
    .filter((g) => g.tiles.length > 0)
}

// ─────────────────────────────────────────────────────────────────────────
// Gli stessi numeri, accanto alle voci del menu.
//
// Chi lavora da iPad non passa dalla dashboard a ogni giro: il menu è l'unico
// posto sempre a portata. I contatori sono quelli dei riquadri "Da fare",
// ricavati qui dagli stessi conteggi, così la voce del menu e il riquadro
// non possono dire numeri diversi.
//
// Le voci a zero non portano badge: un menu pieno di zeri si smette di
// leggere, come la dashboard.
// ─────────────────────────────────────────────────────────────────────────

export type NavCounter = { count: number; tone: TodoTone }
// Chiave = href della voce in ADMIN_NAV
export type NavCounters = Record<string, NavCounter>

export type NavCounterInput = Pick<
  TodoCounters,
  | "scadenzeInRitardo"
  | "ricevuteDaConsegnare"
  | "certificatiScaduti"
  | "certificatiAssenti"
  | "tessereDaFare"
>

export const NAV_COUNTER_HREF = {
  scadenze: "/admin/scadenze",
  ricevute: "/admin/receipts",
  certificati: "/admin/medical-certificates",
  tessere: "/admin/tessere",
} as const

export function navCounters(counters: NavCounterInput): NavCounters {
  const out: NavCounters = {}

  if (counters.scadenzeInRitardo.count > 0) {
    out[NAV_COUNTER_HREF.scadenze] = {
      count: counters.scadenzeInRitardo.count,
      tone: "amber",
    }
  }

  // Emesse e non ancora arrivate alla famiglia: email, condivisione o
  // consegna a mano, lo stesso predicato del chip e del riquadro
  if (counters.ricevuteDaConsegnare > 0) {
    out[NAV_COUNTER_HREF.ricevute] = {
      count: counters.ricevuteDaConsegnare,
      tone: "amber",
    }
  }

  // Scaduti e assenti insieme: sono le allieve che oggi non possono fare
  // lezione, ed è l'unico rosso del menu perché è l'unico che blocca
  const certificati = counters.certificatiScaduti + counters.certificatiAssenti
  if (certificati > 0) {
    out[NAV_COUNTER_HREF.certificati] = { count: certificati, tone: "red" }
  }

  if (counters.tessereDaFare.count > 0) {
    out[NAV_COUNTER_HREF.tessere] = {
      count: counters.tessereDaFare.count,
      tone: "amber",
    }
  }

  return out
}
