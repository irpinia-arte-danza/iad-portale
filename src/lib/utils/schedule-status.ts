import type { ScheduleStatus } from "@prisma/client"

export type ScheduleDisplayStatus =
  | "OVERDUE"
  | "DUE"
  | "FUTURE"
  | "PAID"
  | "WAIVED"

const DUE_SOON_DAYS = 7

export function computeScheduleDisplayStatus(schedule: {
  status: ScheduleStatus
  dueDate: Date
}): ScheduleDisplayStatus {
  if (schedule.status === "PAID") return "PAID"
  if (schedule.status === "WAIVED") return "WAIVED"

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const due = new Date(schedule.dueDate)
  due.setHours(0, 0, 0, 0)

  if (due < today) return "OVERDUE"

  const threshold = new Date(today)
  threshold.setDate(threshold.getDate() + DUE_SOON_DAYS)

  return due < threshold ? "DUE" : "FUTURE"
}
