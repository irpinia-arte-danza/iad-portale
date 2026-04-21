import type { ScheduleStatus } from "@prisma/client"

export function computeScheduleDisplayStatus(schedule: {
  status: ScheduleStatus
  dueDate: Date
}): ScheduleStatus {
  if (schedule.status !== "DUE") return schedule.status

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const due = new Date(schedule.dueDate)
  due.setHours(0, 0, 0, 0)

  return due < today ? "OVERDUE" : "DUE"
}
