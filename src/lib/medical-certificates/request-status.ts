import "server-only"

import { AuditAction } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import {
  NEVER_REMINDED,
  type ReminderTrace,
} from "@/lib/scadenze/reminder-trace"

import {
  REQUEST_SCOPE_CERTIFICATE,
  summarizeCertRequests,
  type CertRequestSummary,
} from "./request-trace"

// ─────────────────────────────────────────────────────────────────────────
// Quando è stato chiesto il certificato, per allieva.
//
// Una query sola su AuditLog, per tutte le allieve dell'elenco:
// • MEDICAL_CERT_EMAIL_SENT — un'email con un testo dei certificati è
//   partita per quell'allieva. Si legge da qui e non da EmailLog perché una
//   sola email può riguardare due sorelle, e EmailLog ha un'allieva sola per
//   riga: l'audit ne ha una per ciascuna.
// • REMINDER_WHATSAPP_OPENED con ambito "certificato" — la chat è stata
//   aperta da qui col messaggio già scritto.
// ─────────────────────────────────────────────────────────────────────────
export async function getCertRequestSummaries(
  athleteIds: string[],
): Promise<Record<string, CertRequestSummary>> {
  const result: Record<string, CertRequestSummary> = {}
  for (const id of athleteIds) result[id] = NEVER_REMINDED
  if (athleteIds.length === 0) return result

  const rows = await prisma.auditLog.findMany({
    where: {
      entityType: "Athlete",
      entityId: { in: athleteIds },
      action: {
        in: [
          AuditAction.MEDICAL_CERT_EMAIL_SENT,
          AuditAction.REMINDER_WHATSAPP_OPENED,
        ],
      },
    },
    select: { entityId: true, action: true, createdAt: true, changes: true },
  })

  const traces = new Map<string, ReminderTrace[]>()
  for (const row of rows) {
    if (!row.entityId) continue
    const isWhatsapp = row.action === AuditAction.REMINDER_WHATSAPP_OPENED
    if (isWhatsapp) {
      // Stessa azione dei solleciti dei contributi: conta solo se l'ambito
      // dice che era per il certificato
      const changes = row.changes as { ambito?: unknown } | null
      if (changes?.ambito !== REQUEST_SCOPE_CERTIFICATE) continue
    }
    const list = traces.get(row.entityId) ?? []
    list.push({ at: row.createdAt, channel: isWhatsapp ? "WHATSAPP" : "EMAIL" })
    traces.set(row.entityId, list)
  }

  for (const [athleteId, list] of traces) {
    result[athleteId] = summarizeCertRequests(list)
  }
  return result
}
