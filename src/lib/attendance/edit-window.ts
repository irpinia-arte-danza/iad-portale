// Le presenze si segnano in sala, al massimo con qualche giorno di ritardo:
// una lezione più vecchia di ATTENDANCE_EDIT_DAYS giorni non si riscrive
// più. La data della lezione è un giorno di calendario a mezzanotte UTC
// (colonna @db.Date), quindi anche il limite lo è.
export const ATTENDANCE_EDIT_DAYS = 7

export function attendanceEditCutoff(now: Date): Date {
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - ATTENDANCE_EDIT_DAYS,
    ),
  )
}
