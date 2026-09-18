"use server"

import { revalidatePath } from "next/cache"

import {
  EmailStatus,
  EmailTrigger,
  Prisma,
  StageAttendanceStatus,
} from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import { resolveCommunicationRecipient } from "@/lib/communications/recipient"
import { renderTemplate } from "@/lib/resend/render-template"
import { sendBatch, type BatchItem } from "@/lib/resend/send-batch"
import { enrollAthleteCore } from "@/lib/stages/enroll-athlete"
import type { ActionResult } from "@/lib/schemas/common"
import { uuidSchema } from "@/lib/schemas/common"
import {
  attendanceMarkSchema,
  stageCreateSchema,
  stageEnrollmentBulkCreateSchema,
  stageEnrollmentCreateSchema,
  stageUpdateSchema,
  type AttendanceMarkValues,
  type StageCreateValues,
  type StageEnrollmentBulkCreateValues,
  type StageEnrollmentCreateValues,
  type StageUpdateValues,
} from "@/lib/schemas/stage"
import { toDateOnly, toDateOnlyOrNull } from "@/lib/utils/date-only"

const STAGES_PATH = "/admin/stages"
const DASHBOARD_PATH = "/admin/dashboard"

function mapPrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "Iscrizione duplicata"
    if (error.code === "P2003") return "Riferimento a record inesistente"
    if (error.code === "P2025") return "Risorsa non trovata"
  }
  console.error("[stages action] unexpected error", error)
  return "Errore interno, riprova"
}

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

function startOfUTCToday(): Date {
  const now = new Date()
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  )
}

function startOfUTCDate(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  )
}

// ─────────────────────────────────────────────────────────────────────────
// CRUD Stage
// ─────────────────────────────────────────────────────────────────────────

export async function createStage(
  values: StageCreateValues,
): Promise<ActionResult<{ id: string }>> {
  const { userId } = await requireAdmin()

  const parsed = stageCreateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  const currentAY = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { id: true },
  })
  if (!currentAY) {
    return { ok: false, error: "Nessun anno accademico corrente configurato" }
  }

  try {
    const stage = await prisma.stage.create({
      data: {
        academicYearId: currentAY.id,
        title: parsed.data.title,
        description: emptyToNull(parsed.data.description),
        date: toDateOnly(parsed.data.date),
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        location: emptyToNull(parsed.data.location),
        capacity: parsed.data.capacity,
        feeCents: Math.round(parsed.data.feeEur * 100),
        registrationOpen: parsed.data.registrationOpen,
        registrationDeadline: toDateOnlyOrNull(parsed.data.registrationDeadline),
      },
      select: { id: true },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "STAGE_CREATE",
        entityType: "Stage",
        entityId: stage.id,
        changes: {
          title: parsed.data.title,
          date: parsed.data.date.toISOString(),
          feeCents: Math.round(parsed.data.feeEur * 100),
          capacity: parsed.data.capacity,
        } satisfies Prisma.InputJsonValue,
      },
    })

    revalidatePath(STAGES_PATH)
    revalidatePath(DASHBOARD_PATH)
    return { ok: true, data: { id: stage.id } }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function updateStage(
  id: string,
  values: StageUpdateValues,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(id)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  const parsed = stageUpdateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  const existing = await prisma.stage.findFirst({
    where: { id: idParsed.data, deletedAt: null },
    select: { id: true },
  })
  if (!existing) return { ok: false, error: "Stage non trovato" }

  try {
    await prisma.stage.update({
      where: { id: idParsed.data },
      data: {
        title: parsed.data.title,
        description: emptyToNull(parsed.data.description),
        date: toDateOnly(parsed.data.date),
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        location: emptyToNull(parsed.data.location),
        capacity: parsed.data.capacity,
        feeCents: Math.round(parsed.data.feeEur * 100),
        registrationOpen: parsed.data.registrationOpen,
        registrationDeadline: toDateOnlyOrNull(parsed.data.registrationDeadline),
      },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "STAGE_UPDATE",
        entityType: "Stage",
        entityId: idParsed.data,
        changes: {
          title: parsed.data.title,
          date: parsed.data.date.toISOString(),
        } satisfies Prisma.InputJsonValue,
      },
    })

    revalidatePath(STAGES_PATH)
    revalidatePath(`${STAGES_PATH}/${idParsed.data}`)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function softDeleteStage(id: string): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(id)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  const existing = await prisma.stage.findFirst({
    where: { id: idParsed.data, deletedAt: null },
    select: { id: true, title: true },
  })
  if (!existing) return { ok: false, error: "Stage non trovato" }

  try {
    await prisma.stage.update({
      where: { id: idParsed.data },
      data: { deletedAt: new Date(), registrationOpen: false },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "STAGE_DELETE",
        entityType: "Stage",
        entityId: idParsed.data,
        changes: { title: existing.title } satisfies Prisma.InputJsonValue,
      },
    })

    revalidatePath(STAGES_PATH)
    revalidatePath(DASHBOARD_PATH)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function toggleRegistrationOpen(
  id: string,
  open: boolean,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(id)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  const existing = await prisma.stage.findFirst({
    where: { id: idParsed.data, deletedAt: null },
    select: { id: true, registrationOpen: true },
  })
  if (!existing) return { ok: false, error: "Stage non trovato" }
  if (existing.registrationOpen === open) {
    return { ok: true } // idempotente
  }

  try {
    await prisma.stage.update({
      where: { id: idParsed.data },
      data: { registrationOpen: open },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "STAGE_UPDATE",
        entityType: "Stage",
        entityId: idParsed.data,
        changes: { registrationOpen: open } satisfies Prisma.InputJsonValue,
      },
    })

    revalidatePath(`${STAGES_PATH}/${idParsed.data}`)
    revalidatePath(STAGES_PATH)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Iscrizioni
// ─────────────────────────────────────────────────────────────────────────

// Iscrizione singola admin. La logica condivisa con il parent portal vive in
// src/lib/stages/enroll-athlete.ts. Autore dell'iscrizione e dell'audit =
// sempre l'admin della sessione, mai un valore passato dal client.
export async function enrollAthlete(
  values: StageEnrollmentCreateValues,
): Promise<ActionResult<{ enrollmentId: string }>> {
  const { userId } = await requireAdmin()

  const parsed = stageEnrollmentCreateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  const result = await enrollAthleteCore({
    stageId: parsed.data.stageId,
    athleteId: parsed.data.athleteId,
    notes: emptyToNull(parsed.data.notes),
    enrolledByUserId: userId,
    auditUserId: userId,
  })

  if (!result.ok) return result

  revalidatePath(STAGES_PATH)
  revalidatePath(`${STAGES_PATH}/${parsed.data.stageId}`)
  revalidatePath("/admin/scadenze")
  return { ok: true, data: { enrollmentId: result.enrollmentId } }
}

// Variante batch (admin: iscrivi N allieve in un colpo solo).
export async function enrollAthletesBulk(
  values: StageEnrollmentBulkCreateValues,
): Promise<
  ActionResult<{
    enrolled: number
    failed: { athleteId: string; reason: string }[]
  }>
> {
  const { userId } = await requireAdmin()

  const parsed = stageEnrollmentBulkCreateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  let enrolled = 0
  const failed: { athleteId: string; reason: string }[] = []

  for (const athleteId of parsed.data.athleteIds) {
    const result = await enrollAthleteCore({
      stageId: parsed.data.stageId,
      athleteId,
      notes: null,
      enrolledByUserId: userId,
      auditUserId: userId,
    })
    if (result.ok) {
      enrolled += 1
    } else {
      failed.push({ athleteId, reason: result.error })
    }
  }

  revalidatePath(STAGES_PATH)
  revalidatePath(`${STAGES_PATH}/${parsed.data.stageId}`)
  revalidatePath("/admin/scadenze")
  return { ok: true, data: { enrolled, failed } }
}

export async function unenrollAthlete(
  enrollmentId: string,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(enrollmentId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  const enrollment = await prisma.stageEnrollment.findUnique({
    where: { id: idParsed.data },
    select: {
      id: true,
      stageId: true,
      paid: true,
      attendance: true,
      paymentSchedule: { select: { id: true } },
    },
  })
  if (!enrollment) return { ok: false, error: "Iscrizione non trovata" }

  if (enrollment.paid) {
    return {
      ok: false,
      error: "Allieva già pagante: stornare prima il pagamento",
    }
  }
  if (enrollment.attendance !== null) {
    return {
      ok: false,
      error: "Presenze già segnate: rimuovi prima la presenza",
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (enrollment.paymentSchedule) {
        await tx.paymentSchedule.delete({
          where: { id: enrollment.paymentSchedule.id },
        })
      }
      await tx.stageEnrollment.delete({
        where: { id: enrollment.id },
      })
      await tx.auditLog.create({
        data: {
          userId,
          action: "STAGE_ENROLLMENT_DELETE",
          entityType: "StageEnrollment",
          entityId: enrollment.id,
          changes: { stageId: enrollment.stageId } satisfies Prisma.InputJsonValue,
        },
      })
    })

    revalidatePath(STAGES_PATH)
    revalidatePath(`${STAGES_PATH}/${enrollment.stageId}`)
    revalidatePath("/admin/scadenze")
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Presenze
// ─────────────────────────────────────────────────────────────────────────

export async function markAttendance(
  values: AttendanceMarkValues,
): Promise<ActionResult<{ updated: number }>> {
  const { userId } = await requireAdmin()

  const parsed = attendanceMarkSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  // Verifica stage + che la data sia oggi/passata
  const stage = await prisma.stage.findUnique({
    where: { id: parsed.data.stageId },
    select: { id: true, date: true },
  })
  if (!stage) return { ok: false, error: "Stage non trovato" }
  const today = startOfUTCToday()
  if (startOfUTCDate(stage.date) > today) {
    return {
      ok: false,
      error: "Le presenze possono essere segnate solo a stage svolto",
    }
  }

  try {
    let updated = 0
    await prisma.$transaction(async (tx) => {
      for (const mark of parsed.data.marks) {
        const e = await tx.stageEnrollment.findFirst({
          where: { id: mark.enrollmentId, stageId: parsed.data.stageId },
          select: { id: true, attendance: true },
        })
        if (!e) continue
        if (e.attendance === mark.status) continue

        await tx.stageEnrollment.update({
          where: { id: e.id },
          data: { attendance: mark.status as StageAttendanceStatus | null },
        })
        updated += 1
      }

      if (updated > 0) {
        await tx.auditLog.create({
          data: {
            userId,
            action: "STAGE_ATTENDANCE_UPDATE",
            entityType: "Stage",
            entityId: parsed.data.stageId,
            changes: {
              updatedCount: updated,
              marks: parsed.data.marks.length,
            } satisfies Prisma.InputJsonValue,
          },
        })
      }
    })

    revalidatePath(`${STAGES_PATH}/${parsed.data.stageId}`)
    return { ok: true, data: { updated } }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Email invito
// ─────────────────────────────────────────────────────────────────────────

const DATE_IT = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const CURRENCY_IT = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export type StageInviteResult = {
  totalEligible: number
  alreadySent: number
  sent: number
  failed: number
  skippedNoEmail: number
  skippedNoCommsConsent: number
  transportError?: string
}

// Invita alla mail i genitori delle allieve attive AA corrente con
// receivesEmailCommunications=true. Idempotente: 1 invio per stage per allieva.
export async function sendStageInvites(
  stageId: string,
): Promise<ActionResult<StageInviteResult>> {
  const admin = await requireAdmin()

  const idParsed = uuidSchema.safeParse(stageId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  const stage = await prisma.stage.findFirst({
    where: { id: idParsed.data, deletedAt: null },
    include: {
      academicYear: { select: { id: true, label: true, isCurrent: true } },
    },
  })
  if (!stage) return { ok: false, error: "Stage non trovato" }

  // Solo allieve attive AA corrente con genitore email + receivesEmailCommunications
  const currentAY = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { id: true },
  })
  if (!currentAY) {
    return { ok: false, error: "Nessun anno accademico corrente configurato" }
  }

  const athletes = await prisma.athlete.findMany({
    where: {
      deletedAt: null,
      enrollments: {
        some: {
          academicYearId: currentAY.id,
          withdrawalDate: null,
        },
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      // Destinataria quando non ha genitori collegati (corso adulti)
      email: true,
      // Serve al limite dei 18 anni per il ripiego sull allieva
      dateOfBirth: true,
      // Nessun filtro su email e consenso: un genitore senza email deve
      // restare visibile qui, altrimenti l'allieva sembrerebbe senza
      // genitori e riceverebbe lei l'invito
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
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              receivesEmailCommunications: true,
            },
          },
        },
      },
    },
  })

  // Dedup: chi ha già ricevuto invito per QUESTO stage
  const alreadySentLogs = await prisma.emailLog.findMany({
    where: {
      templateSlug: "stage-invite",
      milestoneKey: `STAGE_INVITE:${stage.id}`,
    },
    select: { athleteId: true, parentId: true },
  })
  const alreadyAthleteIds = new Set(
    alreadySentLogs.map((l) => l.athleteId).filter((id): id is string => !!id),
  )

  let totalEligible = 0
  let alreadySent = 0
  let skippedNoEmail = 0
  let skippedNoCommsConsent = 0

  type SendableItem = {
    athleteId: string
    // null quando l'invito va all'allieva stessa
    parentId: string | null
    recipientEmail: string
    recipientName: string
    athleteName: string
    subject: string
    html: string
    text: string | null
  }
  const sendable: SendableItem[] = []

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""
  const signupUrl = `${appUrl}/parent/stages`

  for (const athlete of athletes) {
    const resolved = resolveCommunicationRecipient(athlete, {
      requireCommunicationsConsent: true,
    })
    if (!resolved.ok) {
      if (resolved.reason === "OPTED_OUT") skippedNoCommsConsent += 1
      else skippedNoEmail += 1
      continue
    }
    const recipient = resolved.recipient
    totalEligible += 1
    if (alreadyAthleteIds.has(athlete.id)) {
      alreadySent += 1
      continue
    }

    const vars = {
      genitore_nome: recipient.name,
      allieva_nome: `${athlete.firstName} ${athlete.lastName}`,
      stage_titolo: stage.title,
      stage_data: DATE_IT.format(stage.date),
      stage_orario_inizio: stage.startTime,
      stage_luogo: stage.location ?? "—",
      stage_quota: `€ ${CURRENCY_IT.format(stage.feeCents / 100)}`,
      stage_scadenza: stage.registrationDeadline
        ? DATE_IT.format(stage.registrationDeadline)
        : DATE_IT.format(stage.date),
      stage_link: signupUrl,
    }

    try {
      const rendered = await renderTemplate("stage-invite", vars)
      sendable.push({
        athleteId: athlete.id,
        parentId: recipient.parentId,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        athleteName: `${athlete.firstName} ${athlete.lastName}`,
        subject: rendered.subject,
        html: rendered.bodyHtml,
        text: rendered.bodyText,
      })
    } catch (err) {
      console.error("[stage invite] render failed", err)
    }
  }

  let sent = 0
  let failed = 0
  let transportError: string | undefined

  if (sendable.length > 0) {
    const batchItems: BatchItem[] = sendable.map((item) => ({
      to: item.recipientEmail,
      subject: item.subject,
      html: item.html,
      text: item.text ?? undefined,
    }))

    const response = await sendBatch(batchItems)
    transportError = response.transportError

    const logPayload = sendable.map((item, idx) => {
      const outcome = response.results[idx]
      const ok = outcome?.success === true
      if (ok) sent += 1
      else failed += 1
      return {
        sentBy: admin.userId,
        recipientEmail: item.recipientEmail,
        recipientName: item.recipientName,
        templateSlug: "stage-invite",
        subject: item.subject,
        bodyHtml: item.html,
        bodyText: item.text,
        athleteId: item.athleteId,
        parentId: item.parentId,
        status: ok ? EmailStatus.SENT : EmailStatus.FAILED,
        providerId: ok ? outcome.providerId : null,
        errorMessage: ok ? null : outcome?.error ?? "Errore invio",
        triggeredBy: EmailTrigger.ADMIN_MANUAL,
        milestoneKey: `STAGE_INVITE:${stage.id}`,
      }
    })

    if (logPayload.length > 0) {
      await prisma.emailLog.createMany({ data: logPayload })
    }

    if (sent > 0) {
      await prisma.auditLog.create({
        data: {
          userId: admin.userId,
          action: "STAGE_EMAIL_SENT",
          entityType: "Stage",
          entityId: stage.id,
          changes: {
            sent,
            failed,
            template: "stage-invite",
          } satisfies Prisma.InputJsonValue,
        },
      })
    }
  }

  revalidatePath(`${STAGES_PATH}/${stage.id}`)

  return {
    ok: true,
    data: {
      totalEligible,
      alreadySent,
      sent,
      failed,
      skippedNoEmail,
      skippedNoCommsConsent,
      transportError,
    },
  }
}

