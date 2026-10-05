import { formatEur } from "@/lib/utils/format"

// ─────────────────────────────────────────────────────────────────────────
// Importo incassato per ciascuna scadenza di un pagamento.
//
// Una quota incassata per meno del suo importo vale quanto incassato: la
// scadenza si allinea e risulta pagata, senza residuo né sconto.
// L'importo generato all'iscrizione è solo il valore provvisorio.
//
// L'allineamento va nei DUE versi, e il tetto non è l'importo della scadenza
// ma la QUOTA DEL CORSO quando è più alta. Serve al caso legittimo: una
// mensile rimasta a 20 € dopo un incasso ridotto poi annullato si incassa a
// 40 € direttamente, e la scadenza torna a 40 € nella stessa operazione —
// senza uscire dal pagamento per correggerla a mano e rientrare.
//
// - mai a zero né oltre il tetto: oltre la quota del corso è quasi sempre un
//   errore di battitura (400 invece di 40) o denaro di un'altra quota
// - dove una quota di riferimento non esiste (contributo di iscrizione,
//   stage, saggio, costume) il tetto resta l'importo della scadenza: lì non
//   c'è un valore "giusto" a cui tornare
// - più scadenze: importo per riga; il totale è la somma delle righe, così
//   ricevuta e ripartizione per tipo quota tornano al centesimo
// Funzioni pure, usate da server e client.
// ─────────────────────────────────────────────────────────────────────────

export type CollectionSchedule = {
  id: string
  amountCents: number
  description: string
  // Quota del corso: tetto dell'incasso quando è più alta dell'importo della
  // scadenza. null/assente dove un valore giusto non esiste.
  referenceAmountCents?: number | null
}

export type CollectionRow = {
  scheduleId: string
  description: string
  // Importo della scadenza prima dell'incasso
  dueCents: number
  collectedCents: number
  // Importo che la scadenza avrà dopo l'incasso
  alignedCents: number
}

// Da dove a dove si muove l'importo della scadenza:
// - "exact": incassato quanto chiedeva, niente da allineare
// - "lowered": incassato meno, la scadenza scende (mese di iscrizione o di
//   ritiro)
// - "raised": incassato più dell'importo attuale ma non oltre la quota del
//   corso: la scadenza torna su. È una correzione, e va tracciata come tale.
export type RowDirection = "exact" | "lowered" | "raised"

export function rowDirection(row: CollectionRow): RowDirection {
  if (row.alignedCents === row.dueCents) return "exact"
  return row.alignedCents > row.dueCents ? "raised" : "lowered"
}

// Tetto dell'incasso su una scadenza: la quota del corso se è più alta
// dell'importo attuale, altrimenti l'importo attuale. Una scadenza alzata a
// mano sopra la quota non viene riabbassata dal tetto.
export function collectionCapCents(schedule: CollectionSchedule): number {
  const reference = schedule.referenceAmountCents
  if (reference != null && reference > schedule.amountCents) return reference
  return schedule.amountCents
}

export type CollectionPlan =
  | { ok: true; rows: CollectionRow[]; totalCents: number }
  | { ok: false; error: string }

export function eurToCents(eur: number): number {
  return Math.round(eur * 100)
}

function row(schedule: CollectionSchedule, collectedCents: number): CollectionRow {
  return {
    scheduleId: schedule.id,
    description: schedule.description,
    dueCents: schedule.amountCents,
    collectedCents,
    alignedCents: Math.min(collectionCapCents(schedule), collectedCents),
  }
}

// Il messaggio dice quale tetto è stato superato: con una quota di
// riferimento più alta dell'importo attuale, dire "supera l'importo della
// scadenza" sarebbe fuorviante — quell'importo si può superare.
function overCapError(
  schedule: CollectionSchedule,
  collectedCents: number,
): string {
  const cap = collectionCapCents(schedule)
  const limite =
    cap > schedule.amountCents
      ? `la quota del corso (${formatEur(cap)})`
      : `l'importo della scadenza (${formatEur(cap)})`
  return `«${schedule.description}»: ${formatEur(collectedCents)} supera ${limite}. Se è denaro di un altro contributo, registralo a parte.`
}

export function planCollection(params: {
  schedules: CollectionSchedule[]
  totalCents: number
  // Importi per riga in centesimi: contano solo con più scadenze
  rowCents?: Record<string, number>
}): CollectionPlan {
  const { schedules, totalCents } = params

  if (totalCents <= 0) {
    return { ok: false, error: "L'importo incassato deve essere maggiore di zero" }
  }
  if (schedules.length === 0) return { ok: true, rows: [], totalCents }
  if (schedules.length === 1) {
    const [schedule] = schedules
    if (totalCents > collectionCapCents(schedule)) {
      return { ok: false, error: overCapError(schedule, totalCents) }
    }
    return { ok: true, rows: [row(schedule, totalCents)], totalCents }
  }

  const rows: CollectionRow[] = []
  for (const schedule of schedules) {
    const collectedCents = params.rowCents?.[schedule.id] ?? schedule.amountCents
    if (collectedCents <= 0) {
      return {
        ok: false,
        error: `«${schedule.description}»: importo a zero. Se non viene pagata, togli la scadenza dal pagamento.`,
      }
    }
    if (collectedCents > collectionCapCents(schedule)) {
      return { ok: false, error: overCapError(schedule, collectedCents) }
    }
    rows.push(row(schedule, collectedCents))
  }

  const sum = rows.reduce((acc, r) => acc + r.collectedCents, 0)
  if (sum !== totalCents) {
    return {
      ok: false,
      error: `L'importo totale (${formatEur(totalCents)}) deve essere la somma delle scadenze (${formatEur(sum)}).`,
    }
  }
  return { ok: true, rows, totalCents }
}

// Righe con importo incassato diverso dall'importo della scadenza: vanno
// nell'audit del pagamento (importo dovuto e importo incassato)
export function amountDifferences(rows: CollectionRow[]): CollectionRow[] {
  return rows.filter((r) => r.collectedCents !== r.dueCents)
}
