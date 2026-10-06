import "server-only"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import { resolveCommunicationRecipient } from "@/lib/communications/recipient"
import {
  classifyCert,
  CURRENT_CERTIFICATE_ORDER,
  daysUntilExpiry,
  type CertStatus,
} from "@/lib/medical-certificates/certificate-status"
import { getCertRequestSummaries } from "@/lib/medical-certificates/request-status"
import type { CertRequestSummary } from "@/lib/medical-certificates/request-trace"
import { isMinorAt } from "@/lib/utils/age"
import { todayDateOnly } from "@/lib/utils/date-only"
import { fullName, listName } from "@/lib/utils/person-name"

// Chi riceve la richiesta del certificato. Stessa regola delle altre
// comunicazioni (resolveCommunicationRecipient): il genitore collegato;
// senza genitori, l'allieva se è maggiorenne; una minorenne senza genitori
// non ha nessuno a cui scrivere.
export type CertRecipient =
  | {
      kind: "PARENT"
      parentId: string
      name: string
      email: string | null
      phone: string | null
    }
  | { kind: "ATHLETE"; name: string; email: string | null; phone: string | null }
  | { kind: "NONE" }

export type AthleteCertRow = {
  athleteId: string
  // "Cognome Nome": l'elenco è ordinato per cognome
  athleteName: string
  // "Nome Cognome": finisce nei testi delle richieste
  athleteFullName: string
  // Corsi dell'anno accademico corrente
  courses: { id: string; name: string }[]
  recipient: CertRecipient
  // Chiave del destinatario: le figlie della stessa famiglia hanno la stessa
  recipientKey: string
  // Perché l'email non può partire (senza email, comunicazioni disattivate,
  // minorenne senza genitori); null se può
  emailBlocker: string | null
  cert: {
    id: string
    type: string
    issueDate: Date
    expiryDate: Date
    doctorName: string | null
  } | null
  status: CertStatus
  daysToExpiry: number | null
  lastRequest: CertRequestSummary
}

// Prima chi non può fare lezione: mancanti, scaduti, poi in scadenza
const STATUS_PRIORITY: Record<CertStatus, number> = {
  missing: 0,
  expired: 1,
  expiring: 2,
  valid: 3,
}

// ─────────────────────────────────────────────────────────────────────────
// L'elenco dei certificati: una riga per allieva attiva.
//
// Numero fisso di query, qualunque sia il numero di allieve: le allieve con
// certificato corrente, genitore di contatto e iscrizioni; l'anno accademico
// corrente; le richieste già fatte (una query su AuditLog per tutte).
//
// Le ritirate restano fuori: non devono fare lezione, quindi un certificato
// non serve. È la stessa popolazione della scheda allieva, dei riquadri in
// dashboard e del badge del menu, e lo stato lo dà la stessa classifyCert:
// i conteggi dei chip non possono essere diversi dai loro.
// ─────────────────────────────────────────────────────────────────────────
export async function getCertificatesOverview(): Promise<AthleteCertRow[]> {
  await requireAdmin()

  const today = todayDateOnly()
  const [athletes, currentYear] = await Promise.all([
    prisma.athlete.findMany({
      where: { deletedAt: null, status: { not: "WITHDRAWN" } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        medicalCertificates: {
          where: { deletedAt: null },
          orderBy: CURRENT_CERTIFICATE_ORDER,
          take: 1,
          select: {
            id: true,
            type: true,
            issueDate: true,
            expiryDate: true,
            doctorName: true,
          },
        },
        enrollments: {
          where: { deletedAt: null, withdrawalDate: null },
          select: {
            academicYearId: true,
            course: { select: { id: true, name: true } },
          },
        },
        parentRelations: {
          where: { parent: { deletedAt: null } },
          orderBy: [{ isPrimaryContact: "desc" }, { isPrimaryPayer: "desc" }],
          take: 1,
          select: {
            parent: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                receivesEmailCommunications: true,
              },
            },
          },
        },
      },
    }),
    prisma.academicYear.findFirst({
      where: { isCurrent: true },
      select: { id: true },
    }),
  ])

  const requests = await getCertRequestSummaries(athletes.map((a) => a.id))

  const rows: AthleteCertRow[] = athletes.map((a) => {
    const cert = a.medicalCertificates[0] ?? null
    const parent = a.parentRelations[0]?.parent ?? null
    const minor = isMinorAt(a.dateOfBirth, today)

    const recipient: CertRecipient = parent
      ? {
          kind: "PARENT",
          parentId: parent.id,
          name: fullName(parent),
          email: parent.email,
          phone: parent.phone,
        }
      : minor
        ? { kind: "NONE" }
        : { kind: "ATHLETE", name: fullName(a), email: a.email, phone: a.phone }

    // La stessa funzione che decide l'invio: il motivo che si legge sulla
    // riga è quello per cui l'email verrebbe saltata
    const resolved = resolveCommunicationRecipient(a, {
      requireCommunicationsConsent: true,
      at: today,
    })

    return {
      athleteId: a.id,
      athleteName: listName(a),
      athleteFullName: fullName(a),
      courses: currentYear
        ? a.enrollments
            .filter((e) => e.academicYearId === currentYear.id)
            .map((e) => e.course)
        : [],
      recipient,
      recipientKey: parent ? `parent:${parent.id}` : `athlete:${a.id}`,
      emailBlocker: resolved.ok ? null : resolved.message,
      cert,
      status: classifyCert(cert?.expiryDate ?? null, today),
      daysToExpiry: cert ? daysUntilExpiry(cert.expiryDate, today) : null,
      lastRequest: requests[a.id],
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

  const today = todayDateOnly()
  const athletes = await prisma.athlete.findMany({
    where: { deletedAt: null, status: { not: "WITHDRAWN" } },
    select: {
      medicalCertificates: {
        where: { deletedAt: null },
        orderBy: CURRENT_CERTIFICATE_ORDER,
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
    counts[classifyCert(expiry, today)] += 1
  }

  return counts
}
