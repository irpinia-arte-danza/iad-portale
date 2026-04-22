"use server"

import { ScheduleStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"

const DATE_IT = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const CURRENCY_IT = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function startOfUTCToday(): Date {
  const now = new Date()
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  )
}

export async function getScadenzeCSVData(
  scheduleIds: string[],
): Promise<{ headers: string[]; rows: string[][] }> {
  await requireAdmin()

  if (scheduleIds.length === 0) {
    return { headers: [], rows: [] }
  }

  const schedules = await prisma.paymentSchedule.findMany({
    where: {
      id: { in: scheduleIds },
      status: ScheduleStatus.DUE,
    },
    orderBy: { dueDate: "asc" },
    include: {
      courseEnrollment: {
        select: {
          course: { select: { name: true } },
          athlete: {
            select: {
              firstName: true,
              lastName: true,
              parentRelations: {
                where: { parent: { deletedAt: null } },
                orderBy: [
                  { isPrimaryPayer: "desc" },
                  { isPrimaryContact: "desc" },
                ],
                take: 1,
                select: {
                  parent: {
                    select: {
                      firstName: true,
                      lastName: true,
                      email: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  const emailAggregates = await prisma.emailLog.groupBy({
    by: ["paymentScheduleId"],
    where: { paymentScheduleId: { in: scheduleIds } },
    _count: { _all: true },
    _max: { sentAt: true },
  })

  const emailMap = new Map<string, { count: number; lastSent: Date | null }>()
  for (const agg of emailAggregates) {
    if (!agg.paymentScheduleId) continue
    emailMap.set(agg.paymentScheduleId, {
      count: agg._count._all,
      lastSent: agg._max.sentAt,
    })
  }

  const today = startOfUTCToday()

  const headers = [
    "Allieva",
    "Genitore",
    "Email",
    "Telefono",
    "Corso",
    "Importo",
    "Scadenza",
    "Giorni ritardo",
    "Ultimo sollecito",
    "Email inviate",
  ]

  const rows = schedules.map((s) => {
    const athlete = s.courseEnrollment.athlete
    const parent = athlete.parentRelations[0]?.parent ?? null
    const email = emailMap.get(s.id)

    const dueUTC = new Date(
      Date.UTC(
        s.dueDate.getUTCFullYear(),
        s.dueDate.getUTCMonth(),
        s.dueDate.getUTCDate(),
      ),
    )
    const giorniRitardo = Math.round(
      (today.getTime() - dueUTC.getTime()) / (1000 * 60 * 60 * 24),
    )

    return [
      `${athlete.lastName} ${athlete.firstName}`,
      parent ? `${parent.lastName} ${parent.firstName}` : "—",
      parent?.email ?? "",
      parent?.phone ?? "",
      s.courseEnrollment.course?.name ?? "—",
      CURRENCY_IT.format(s.amountCents / 100),
      DATE_IT.format(s.dueDate),
      String(giorniRitardo),
      email?.lastSent ? DATE_IT.format(email.lastSent) : "",
      String(email?.count ?? 0),
    ]
  })

  return { headers, rows }
}
