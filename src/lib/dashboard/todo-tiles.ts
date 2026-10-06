import { athleteStepHref } from "@/lib/athletes/list-filters"
import { statusTone, type StatusTone } from "@/lib/status/tone"

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

// Il tono non si sceglie qui: lo decide statusTone dallo stato di dominio,
// come per i badge, la striscia della scheda e i contatori del menu
export type TodoTone = StatusTone

export type TodoTile = {
  id: string
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
  // Genitori mai invitati all'area riservata
  genitoriSenzaAccesso: number
  allieveSenzaGenitore: number
  allieveSenzaCorso: number
  allieveSenzaEmail: number
  // Senza informativa privacy firmata e registrata
  allieveSenzaPrivacy: number
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
export const GENITORI_SENZA_ACCESSO_HREF = "/admin/parents?filtro=senza-accesso"
// La pagina Tessere apre già con l'elenco da mandare al referente: l'ancora
// ci porta sopra senza inventare un filtro che non esiste
export const TESSERE_DA_FARE_HREF = "/admin/tessere#da-tesserare"

function plural(count: number, uno: string, molti: string): string {
  return count === 1 ? uno : molti
}

export function todoTiles(counters: TodoCounters): TodoTile[] {
  const tiles: TodoTile[] = []

  // ── Blocca qualcosa ─────────────────────────────────────────────────────
  // Prima chi oggi non può fare lezione, poi chi non si riesce a raggiungere

  if (counters.certificatiScaduti > 0) {
    tiles.push({
      id: "certificati-scaduti",
      label: plural(
        counters.certificatiScaduti,
        "Certificato scaduto",
        "Certificati scaduti",
      ),
      count: counters.certificatiScaduti,
      href: CERT_STATUS_HREF.expired,
      tone: statusTone({ kind: "certificate", status: "expired" }),
    })
  }

  if (counters.certificatiAssenti > 0) {
    tiles.push({
      id: "certificati-assenti",
      label: "Certificati assenti",
      count: counters.certificatiAssenti,
      href: CERT_STATUS_HREF.missing,
      tone: statusTone({ kind: "certificate", status: "missing" }),
    })
  }

  if (counters.tessereDaFare.count > 0) {
    tiles.push({
      id: "tessere-da-fare",
      label: "Da tesserare",
      count: counters.tessereDaFare.count,
      href: TESSERE_DA_FARE_HREF,
      // Senza tessera non c'è assicurazione: in sala non ci entra
      tone: statusTone({ kind: "card", status: "missing" }),
      note: `Anno sociale ${counters.tessereDaFare.seasonYear}`,
    })
  }

  if (counters.allieveSenzaGenitore > 0) {
    tiles.push({
      id: "allieve-senza-genitore",
      label: plural(
        counters.allieveSenzaGenitore,
        "Minorenne senza genitore",
        "Minorenni senza genitore",
      ),
      count: counters.allieveSenzaGenitore,
      href: athleteStepHref("guardian"),
      tone: statusTone({ kind: "guardian", missing: true }),
    })
  }

  // ── Da sistemare ────────────────────────────────────────────────────────

  if (counters.scadenzeInRitardo.count > 0) {
    tiles.push({
      id: "scadenze-in-ritardo",
      label: plural(
        counters.scadenzeInRitardo.count,
        "Scadenza in ritardo",
        "Scadenze in ritardo",
      ),
      count: counters.scadenzeInRitardo.count,
      amountCents: counters.scadenzeInRitardo.amountCents,
      href: SCADENZE_IN_RITARDO_HREF,
      // In ritardo non vuol dire bloccata: la lezione si fa e si sollecita
      tone: statusTone({ kind: "contributions", overdue: true }),
      note:
        counters.inScadenza7gg > 0
          ? `+ ${counters.inScadenza7gg} in scadenza entro 7 giorni`
          : undefined,
    })
  }

  if (counters.pagamentiSenzaRicevuta > 0) {
    tiles.push({
      id: "pagamenti-senza-ricevuta",
      label: plural(
        counters.pagamentiSenzaRicevuta,
        "Pagamento senza ricevuta",
        "Pagamenti senza ricevuta",
      ),
      count: counters.pagamentiSenzaRicevuta,
      href: PAGAMENTI_SENZA_RICEVUTA_HREF,
      tone: statusTone({ kind: "receipt", toDeliver: true }),
    })
  }

  if (counters.ricevuteDaConsegnare > 0) {
    tiles.push({
      id: "ricevute-da-consegnare",
      label: plural(
        counters.ricevuteDaConsegnare,
        "Ricevuta da consegnare",
        "Ricevute da consegnare",
      ),
      count: counters.ricevuteDaConsegnare,
      href: RICEVUTE_DA_CONSEGNARE_HREF,
      tone: statusTone({ kind: "receipt", toDeliver: true }),
    })
  }

  if (counters.allieveSenzaCorso > 0) {
    tiles.push({
      id: "allieve-senza-corso",
      label: "Senza corso quest'anno",
      count: counters.allieveSenzaCorso,
      href: athleteStepHref("course"),
      tone: statusTone({ kind: "setupStep", step: "course" }),
    })
  }

  if (counters.allieveSenzaEmail > 0) {
    tiles.push({
      id: "allieve-senza-email",
      label: plural(
        counters.allieveSenzaEmail,
        "Maggiorenne senza email",
        "Maggiorenni senza email",
      ),
      count: counters.allieveSenzaEmail,
      href: athleteStepHref("email"),
      tone: statusTone({ kind: "setupStep", step: "email" }),
    })
  }

  if (counters.allieveSenzaPrivacy > 0) {
    tiles.push({
      id: "allieve-senza-privacy",
      label: "Senza consenso privacy",
      count: counters.allieveSenzaPrivacy,
      href: athleteStepHref("privacy"),
      tone: statusTone({ kind: "setupStep", step: "privacy" }),
    })
  }

  if (counters.genitoriSenzaAccesso > 0) {
    tiles.push({
      id: "genitori-senza-accesso",
      label: plural(
        counters.genitoriSenzaAccesso,
        "Genitore senza accesso",
        "Genitori senza accesso",
      ),
      count: counters.genitoriSenzaAccesso,
      href: GENITORI_SENZA_ACCESSO_HREF,
      tone: statusTone({ kind: "access", invited: false }),
    })
  }

  if (counters.certificatiInScadenza > 0) {
    tiles.push({
      id: "certificati-in-scadenza",
      label: "Certificati in scadenza",
      count: counters.certificatiInScadenza,
      href: CERT_STATUS_HREF.expiring,
      tone: statusTone({ kind: "certificate", status: "expiring" }),
    })
  }

  return tiles
}

// ─────────────────────────────────────────────────────────────────────────
// Due sezioni, non tre gruppi per argomento.
//
// Prima i riquadri erano divisi per area (Incassi, Allieve, Documenti), e per
// sapere cosa fosse urgente bisognava leggerli tutti. Adesso la domanda è
// una sola: cosa impedisce di lavorare, e cosa invece si sistema con calma.
// Una sezione senza riquadri non si mostra.
// ─────────────────────────────────────────────────────────────────────────

export type TodoSectionId = "block" | "fix"

export type TodoSection = {
  id: TodoSectionId
  title: string
  tiles: TodoTile[]
}

const SECTION_TITLE: Record<TodoSectionId, string> = {
  block: "Blocca qualcosa",
  fix: "Da sistemare",
}

export function todoSections(tiles: TodoTile[]): TodoSection[] {
  const order: TodoSectionId[] = ["block", "fix"]
  return order
    .map((id) => ({
      id,
      title: SECTION_TITLE[id],
      // L'ordine dentro la sezione è quello in cui todoTiles li crea
      tiles: tiles.filter((tile) => tile.tone === id),
    }))
    .filter((section) => section.tiles.length > 0)
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
      tone: statusTone({ kind: "contributions", overdue: true }),
    }
  }

  // Emesse e non ancora arrivate alla famiglia: email, condivisione o
  // consegna a mano, lo stesso predicato del chip e del riquadro
  if (counters.ricevuteDaConsegnare > 0) {
    out[NAV_COUNTER_HREF.ricevute] = {
      count: counters.ricevuteDaConsegnare,
      tone: statusTone({ kind: "receipt", toDeliver: true }),
    }
  }

  // Scaduti e assenti insieme: sono le allieve che oggi non possono fare
  // lezione, ed è l'unico rosso del menu perché è l'unico che blocca
  const certificati = counters.certificatiScaduti + counters.certificatiAssenti
  if (certificati > 0) {
    out[NAV_COUNTER_HREF.certificati] = {
      count: certificati,
      tone: statusTone({ kind: "certificate", status: "missing" }),
    }
  }

  if (counters.tessereDaFare.count > 0) {
    out[NAV_COUNTER_HREF.tessere] = {
      count: counters.tessereDaFare.count,
      // Rosso come i certificati: senza tessera non c'è assicurazione
      tone: statusTone({ kind: "card", status: "missing" }),
    }
  }

  return out
}
