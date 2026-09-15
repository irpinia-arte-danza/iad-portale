import { formatEur } from "@/lib/utils/format"

// ─────────────────────────────────────────────────────────────────────────
// Importo incassato per ciascuna scadenza di un pagamento.
//
// Una quota incassata per meno del suo importo vale quanto incassato: la
// scadenza si allinea e risulta pagata, senza residuo né sconto.
// L'importo generato all'iscrizione è solo il valore provvisorio.
//
// - mai a zero né oltre l'importo della scadenza: di solito è un errore di
//   battitura o denaro di un'altra quota, da registrare a parte
// - più scadenze: importo per riga; il totale è la somma delle righe, così
//   ricevuta e ripartizione per tipo quota tornano al centesimo
// Funzioni pure, usate da server e client.
// ─────────────────────────────────────────────────────────────────────────

export type CollectionSchedule = {
  id: string
  amountCents: number
  description: string
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
    alignedCents: Math.min(schedule.amountCents, collectedCents),
  }
}

function overDueError(schedule: CollectionSchedule, collectedCents: number): string {
  return `«${schedule.description}»: ${formatEur(collectedCents)} supera l'importo della scadenza (${formatEur(schedule.amountCents)}). Se è denaro di un'altra quota, registralo a parte.`
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
    if (totalCents > schedule.amountCents) {
      return { ok: false, error: overDueError(schedule, totalCents) }
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
    if (collectedCents > schedule.amountCents) {
      return { ok: false, error: overDueError(schedule, collectedCents) }
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
