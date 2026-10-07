// ─────────────────────────────────────────────────────────────────────────
// Una rata è «da pagare» quando la scadenza è passata (o la segreteria l'ha
// già segnata OVERDUE). È ambra, non rossa: si paga e si va avanti, la
// lezione intanto si fa (vedi statusTone, kind "contributions").
//
// dueDate è una colonna @db.Date, cioè un giorno a mezzanotte UTC: il
// confronto si fa sul giorno UTC, non sull'ora locale (§17.40).
// ─────────────────────────────────────────────────────────────────────────

export function isScheduleOverdue(
  schedule: { status: string; dueDate: Date },
  today: Date = new Date(),
): boolean {
  if (schedule.status === "OVERDUE") return true
  const due = new Date(schedule.dueDate)
  const dueDay = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate())
  const todayDay = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  return dueDay < todayDay
}
