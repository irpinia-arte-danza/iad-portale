// ─────────────────────────────────────────────────────────────────────────
// Annullare e ritirare sono due cose diverse, e le rate lo sentono.
//
// ANNULLA: l'iscrizione non doveva esistere. Spariscono lei e tutte le sue
// rate non pagate. Vietato se una rata è pagata: prima si storna il
// pagamento, altrimenti si perde un incasso di vista.
//
// RITIRA: ha frequentato e smette. Restano dovute le rate fino al mese del
// ritiro compreso — sono mesi frequentati — e vanno via quelle dei mesi
// successivi, che nessuno le deve più.
// ─────────────────────────────────────────────────────────────────────────

export type ScheduleStatusValue = "DUE" | "PAID" | "WAIVED" | "OVERDUE"

export type RuleSchedule = {
  id: string
  dueDate: Date
  status: ScheduleStatusValue
  amountCents: number
}

export function isPaid(s: { status: ScheduleStatusValue }): boolean {
  return s.status === "PAID"
}

// Una rata pagata non si annulla mai: si storna il pagamento, e quella è
// un'altra operazione con un'altra traccia contabile.
export function paidSchedules(schedules: RuleSchedule[]): RuleSchedule[] {
  return schedules.filter(isPaid)
}

export type CancelCheck =
  | { ok: true; removable: RuleSchedule[] }
  | { ok: false; paidCount: number; message: string }

export function checkCancelEnrollment(
  schedules: RuleSchedule[],
): CancelCheck {
  const paid = paidSchedules(schedules)
  if (paid.length > 0) {
    return {
      ok: false,
      paidCount: paid.length,
      message:
        paid.length === 1
          ? "Questa iscrizione ha una rata già pagata: prima storna il pagamento, poi annulla l'iscrizione."
          : `Questa iscrizione ha ${paid.length} rate già pagate: prima storna i pagamenti, poi annulla l'iscrizione.`,
    }
  }
  // Annullare porta via tutto quello che non è pagato, condoni compresi:
  // l'iscrizione non è mai esistita, quindi non c'era niente da condonare
  return { ok: true, removable: schedules }
}

// Mese di calendario in UTC, come sono salvate le date "solo giorno"
function monthIndex(date: Date): number {
  const d = new Date(date)
  return d.getUTCFullYear() * 12 + d.getUTCMonth()
}

export type WithdrawalSplit = {
  // Restano dovute: mesi frequentati, fino al mese del ritiro compreso
  keep: RuleSchedule[]
  // Vanno nel Cestino: mesi successivi al ritiro, mai pagate
  remove: RuleSchedule[]
}

// Il confronto è fra MESI, non fra giorni: la rata di marzo scade il 10 marzo,
// e chi si ritira il 5 marzo marzo lo deve comunque — ha frequentato quel
// mese. Come il mese di iscrizione, l'importo si aggiusta all'incasso.
//
// Le rate già pagate non si toccano nemmeno se sono di mesi futuri: qualcuno
// ha versato quei soldi, e farli sparire sarebbe un buco in cassa.
export function splitSchedulesOnWithdrawal(
  schedules: RuleSchedule[],
  withdrawalDate: Date,
): WithdrawalSplit {
  const limit = monthIndex(withdrawalDate)
  const keep: RuleSchedule[] = []
  const remove: RuleSchedule[] = []

  for (const schedule of schedules) {
    if (isPaid(schedule) || monthIndex(schedule.dueDate) <= limit) {
      keep.push(schedule)
    } else {
      remove.push(schedule)
    }
  }

  return { keep, remove }
}

export function sumCents(schedules: RuleSchedule[]): number {
  return schedules.reduce((total, s) => total + s.amountCents, 0)
}
