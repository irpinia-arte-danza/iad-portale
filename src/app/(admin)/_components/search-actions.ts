"use server"

import { Prisma } from "@prisma/client"

import { requireAdmin } from "@/lib/auth/require-admin"
import { classifyCert } from "@/lib/medical-certificates/certificate-status"
import { CURRENT_CERTIFICATE_ORDER } from "@/lib/medical-certificates/certificate-status"
import { prisma } from "@/lib/prisma"
import {
  mergeHits,
  nameSearchWhere,
  MAX_SEARCH_RESULTS,
  type AthleteHit,
  type ParentHit,
  type PersonHit,
} from "@/lib/search/person-search"
import { computeAge } from "@/lib/utils/date-helpers"
import { todayDateOnly } from "@/lib/utils/date-only"
import { whatsappHref } from "@/lib/utils/whatsapp"

import { scadenzeWhere } from "../admin/scadenze/queries"

// Allieve e genitori per nome e cognome, in qualsiasi ordine. Solo admin:
// l'header con la ricerca esiste solo nell'area admin, ma il controllo sta
// qui perché è il server a doverlo fare.
export async function searchPeople(query: string): Promise<PersonHit[]> {
  await requireAdmin()

  const where = nameSearchWhere(query)
  if (!where) return []

  const [athletes, parents] = await Promise.all([
    prisma.athlete.findMany({
      where: { deletedAt: null, ...(where as Prisma.AthleteWhereInput) },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: MAX_SEARCH_RESULTS,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        medicalCertificates: {
          where: { deletedAt: null },
          orderBy: CURRENT_CERTIFICATE_ORDER,
          take: 1,
          select: { expiryDate: true },
        },
        enrollments: {
          where: { deletedAt: null, academicYear: { isCurrent: true } },
          orderBy: { enrollmentDate: "desc" },
          take: 1,
          select: { course: { select: { name: true } } },
        },
      },
    }),
    prisma.parent.findMany({
      where: { deletedAt: null, ...(where as Prisma.ParentWhereInput) },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: MAX_SEARCH_RESULTS,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        athleteRelations: {
          where: { athlete: { deletedAt: null } },
          orderBy: [{ isPrimaryContact: "desc" }],
          select: {
            athlete: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
  ])

  // Chi ha contributi in ritardo, con il filtro dell'elenco Scadenze: il
  // pallino rosso nella ricerca e la riga in Scadenze dicono la stessa cosa
  const athleteIds = athletes.map((a) => a.id)
  const overdue =
    athleteIds.length === 0
      ? []
      : await prisma.paymentSchedule.findMany({
          where: {
            AND: [
              scadenzeWhere({ stato: "IN_RITARDO" }),
              {
                OR: [
                  { athleteId: { in: athleteIds } },
                  { courseEnrollment: { athleteId: { in: athleteIds } } },
                ],
              },
            ],
          },
          select: {
            athleteId: true,
            courseEnrollment: { select: { athleteId: true } },
          },
        })

  const overdueIds = new Set(
    overdue.map((s) => s.athleteId ?? s.courseEnrollment?.athleteId ?? ""),
  )

  const today = todayDateOnly()
  const athleteHits: AthleteHit[] = athletes.map((a) => {
    const status = classifyCert(
      a.medicalCertificates[0]?.expiryDate ?? null,
      today,
    )
    return {
      kind: "athlete",
      id: a.id,
      name: `${a.lastName} ${a.firstName}`,
      age: computeAge(a.dateOfBirth),
      course: a.enrollments[0]?.course.name ?? null,
      certificateMissing: status === "missing" || status === "expired",
      overdue: overdueIds.has(a.id),
    }
  })

  const parentHits: ParentHit[] = parents.map((p) => ({
    kind: "parent",
    id: p.id,
    name: `${p.lastName} ${p.firstName}`,
    athletes: p.athleteRelations.map(
      (r) => `${r.athlete.firstName} ${r.athlete.lastName}`,
    ),
    whatsappHref: whatsappHref(p.phone),
  }))

  return mergeHits(athleteHits, parentHits)
}
