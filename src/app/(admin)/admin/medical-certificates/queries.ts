import "server-only"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import {
  classifyCert,
  type CertStatus,
} from "@/lib/schemas/medical-certificate"

export type AthleteCertRow = {
  athleteId: string
  athleteName: string
  parentName: string | null
  parentEmail: string | null
  parentId: string | null
  cert: {
    id: string
    type: string
    issueDate: Date
    expiryDate: Date
    doctorName: string | null
  } | null
  status: CertStatus
  daysToExpiry: number | null
}

const STATUS_PRIORITY: Record<CertStatus, number> = {
  expired: 0,
  expiring: 1,
  missing: 2,
  valid: 3,
}

function diffDays(expiry: Date | null): number | null {
  if (!expiry) return null
  const now = Date.now()
  const e = new Date(expiry).getTime()
  return Math.floor((e - now) / (1000 * 60 * 60 * 24))
}

export async function getCertificatesOverview(): Promise<AthleteCertRow[]> {
  await requireAdmin()

  const athletes = await prisma.athlete.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      medicalCertificates: {
        where: { deletedAt: null },
        orderBy: { issueDate: "desc" },
        take: 1,
        select: {
          id: true,
          type: true,
          issueDate: true,
          expiryDate: true,
          doctorName: true,
        },
      },
      parentRelations: {
        where: { parent: { deletedAt: null } },
        orderBy: [
          { isPrimaryContact: "desc" },
          { isPrimaryPayer: "desc" },
        ],
        take: 1,
        select: {
          parent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    },
  })

  const rows: AthleteCertRow[] = athletes.map((a) => {
    const cert = a.medicalCertificates[0] ?? null
    const status = classifyCert(cert?.expiryDate ?? null)
    const parent = a.parentRelations[0]?.parent ?? null
    return {
      athleteId: a.id,
      athleteName: `${a.lastName} ${a.firstName}`,
      parentName: parent ? `${parent.firstName} ${parent.lastName}` : null,
      parentEmail: parent?.email ?? null,
      parentId: parent?.id ?? null,
      cert,
      status,
      daysToExpiry: diffDays(cert?.expiryDate ?? null),
    }
  })

  rows.sort((a, b) => {
    const p = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]
    if (p !== 0) return p
    return a.athleteName.localeCompare(b.athleteName, "it")
  })

  return rows
}

export async function getCertificateStatusCounts(): Promise<
  Record<CertStatus, number>
> {
  await requireAdmin()

  const athletes = await prisma.athlete.findMany({
    where: { deletedAt: null },
    select: {
      medicalCertificates: {
        where: { deletedAt: null },
        orderBy: { issueDate: "desc" },
        take: 1,
        select: { expiryDate: true },
      },
    },
  })

  const counts: Record<CertStatus, number> = {
    missing: 0,
    expired: 0,
    expiring: 0,
    valid: 0,
  }

  for (const a of athletes) {
    const expiry = a.medicalCertificates[0]?.expiryDate ?? null
    counts[classifyCert(expiry)] += 1
  }

  return counts
}
