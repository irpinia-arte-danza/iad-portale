import type { ScheduleStatus } from "@prisma/client"

import { toDateOnly, todayDateOnly } from "@/lib/utils/date-only"

export type ScheduleDisplayStatus =
  | "OVERDUE"
  | "DUE"
  | "FUTURE"
  | "PAID"
  | "WAIVED"

const DUE_SOON_DAYS = 7

// "Oggi" è il giorno di calendario di Roma, non quello del server: calcolato
// con setHours(0,0,0,0) su Vercel (che gira in UTC) fra mezzanotte e le 2 il
// giorno era ancora quello prima, e una rata scaduta ieri finiva fra quelle
// "in scadenza". Stessa correzione già fatta per la dashboard e per l'elenco
// Scadenze (vedi §17.40).
export function computeScheduleDisplayStatus(
  schedule: {
    status: ScheduleStatus
    dueDate: Date
  },
  at: Date = new Date(),
): ScheduleDisplayStatus {
  if (schedule.status === "PAID") return "PAID"
  if (schedule.status === "WAIVED") return "WAIVED"

  const today = todayDateOnly(at)
  const due = toDateOnly(schedule.dueDate)

  if (due < today) return "OVERDUE"

  const threshold = new Date(today)
  threshold.setUTCDate(threshold.getUTCDate() + DUE_SOON_DAYS)

  return due < threshold ? "DUE" : "FUTURE"
}
