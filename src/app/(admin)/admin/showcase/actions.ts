"use server"

import { revalidatePath } from "next/cache"

import {
  FeeType,
  PaymentMode,
  Prisma,
  ScheduleStatus,
} from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import type { ActionResult } from "@/lib/schemas/common"
import { uuidSchema } from "@/lib/schemas/common"
import {
  confirmParticipationSchema,
  participationBulkCreateSchema,
  participationCreateSchema,
  showcaseCreateSchema,
  showcaseUpdateSchema,
  updateChoreographySchema,
  type ConfirmParticipationValues,
  type ParticipationBulkCreateValues,
  type ParticipationCreateValues,
  type ShowcaseCreateValues,
  type ShowcaseUpdateValues,
  type UpdateChoreographyValues,
} from "@/lib/schemas/showcase"

const SHOWCASE_PATH = "/admin/showcase"
const DASHBOARD_PATH = "/admin/dashboard"
const SCADENZE_PATH = "/admin/scadenze"

function mapPrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "Duplicato"
    if (error.code === "P2003") return "Riferimento a record inesistente"
    if (error.code === "P2025") return "Risorsa non trovata"
  }
  console.error("[showcase action] unexpected error", error)
  return "Errore interno, riprova"
}

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

// ─────────────────────────────────────────────────────────────────────────
// CRUD Showcase
// ─────────────────────────────────────────────────────────────────────────

export async function createShowcase(
  values: ShowcaseCreateValues,
): Promise<ActionResult<{ id: string }>> {
  const { userId } = await requireAdmin()

  const parsed = showcaseCreateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  // 1 Showcase per AcademicYear (anche se soft-deleted: ricicliamo? No,
  // unique sul DB blocca. Manteniamo unique e richiediamo restore se
  // l'utente vuole riusare l'AA).
  const existing = await prisma.showcase.findUnique({
    where: { academicYearId: parsed.data.academicYearId },
    select: { id: true, deletedAt: true },
  })
  if (existing) {
    return {
      ok: false,
      error: existing.deletedAt
        ? "Esiste già un saggio per questo AA nel cestino — ripristinalo"
        : "Esiste già un saggio per questo anno accademico",
    }
  }

  try {
    const showcase = await prisma.showcase.create({
      data: {
        academicYearId: parsed.data.academicYearId,
        title: parsed.data.title,
        description: emptyToNull(parsed.data.description),
        date: parsed.data.date,
        location: emptyToNull(parsed.data.location),
        rehearsalDate: parsed.data.rehearsalDate ?? null,
        firstInstallmentCents: Math.round(parsed.data.firstInstallmentEur * 100),
        secondInstallmentCents: Math.round(
          parsed.data.secondInstallmentEur * 100,
        ),
        firstDeadline: parsed.data.firstDeadline,
        secondDeadline: parsed.data.secondDeadline,
      },
      select: { id: true },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "SHOWCASE_CREATE",
        entityType: "Showcase",
        entityId: showcase.id,
        changes: {
          title: parsed.data.title,
          date: parsed.data.date.toISOString(),
          firstInstallmentCents: Math.round(
            parsed.data.firstInstallmentEur * 100,
          ),
          secondInstallmentCents: Math.round(
            parsed.data.secondInstallmentEur * 100,
          ),
        } satisfies Prisma.InputJsonValue,
      },
    })

    revalidatePath(SHOWCASE_PATH)
    revalidatePath(DASHBOARD_PATH)
    return { ok: true, data: { id: showcase.id } }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function updateShowcase(
  id: string,
  values: ShowcaseUpdateValues,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(id)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  const parsed = showcaseUpdateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  const existing = await prisma.showcase.findFirst({
    where: { id: idParsed.data, deletedAt: null },
    select: { id: true },
  })
  if (!existing) return { ok: false, error: "Saggio non trovato" }

  try {
    await prisma.showcase.update({
      where: { id: idParsed.data },
      data: {
        title: parsed.data.title,
        description: emptyToNull(parsed.data.description),
        date: parsed.data.date,
        location: emptyToNull(parsed.data.location),
        rehearsalDate: parsed.data.rehearsalDate ?? null,
        firstInstallmentCents: Math.round(parsed.data.firstInstallmentEur * 100),
        secondInstallmentCents: Math.round(
          parsed.data.secondInstallmentEur * 100,
        ),
        firstDeadline: parsed.data.firstDeadline,
        secondDeadline: parsed.data.secondDeadline,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "SHOWCASE_UPDATE",
        entityType: "Showcase",
        entityId: idParsed.data,
        changes: {
          title: parsed.data.title,
          date: parsed.data.date.toISOString(),
        } satisfies Prisma.InputJsonValue,
      },
    })

    revalidatePath(SHOWCASE_PATH)
    revalidatePath(`${SHOWCASE_PATH}/${idParsed.data}`)
    revalidatePath(DASHBOARD_PATH)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function softDeleteShowcase(id: string): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(id)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  const existing = await prisma.showcase.findFirst({
    where: { id: idParsed.data, deletedAt: null },
    select: {
      id: true,
      title: true,
      participations: {
        select: {
          id: true,
          paymentSchedules: {
            where: { status: ScheduleStatus.PAID },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  })
  if (!existing) return { ok: false, error: "Saggio non trovato" }

  const hasPaidParticipation = existing.participations.some(
    (p) => p.paymentSchedules.length > 0,
  )
  if (hasPaidParticipation) {
    return {
      ok: false,
      error:
        "Esistono partecipazioni con pagamenti registrati: rimuovi o storna i pagamenti prima",
    }
  }

  try {
    await prisma.showcase.update({
      where: { id: idParsed.data },
      data: { deletedAt: new Date() },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "SHOWCASE_DELETE",
        entityType: "Showcase",
        entityId: idParsed.data,
        changes: { title: existing.title } satisfies Prisma.InputJsonValue,
      },
    })

    revalidatePath(SHOWCASE_PATH)
    revalidatePath(DASHBOARD_PATH)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Partecipazioni
// ─────────────────────────────────────────────────────────────────────────

export async function createParticipation(
  values: ParticipationCreateValues,
): Promise<ActionResult<{ id: string }>> {
  const { userId } = await requireAdmin()

  const parsed = participationCreateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  const result = await createParticipationCore({
    showcaseId: parsed.data.showcaseId,
    athleteId: parsed.data.athleteId,
    choreography: emptyToNull(parsed.data.choreography),
    notes: emptyToNull(parsed.data.notes),
    auditUserId: userId,
  })

  if (!result.ok) return result

  revalidatePath(`${SHOWCASE_PATH}/${parsed.data.showcaseId}`)
  return { ok: true, data: { id: result.participationId } }
}

export async function createParticipationsBulk(
  values: ParticipationBulkCreateValues,
): Promise<
  ActionResult<{
    enrolled: number
    failed: { athleteId: string; reason: string }[]
  }>
> {
  const { userId } = await requireAdmin()

  const parsed = participationBulkCreateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  let enrolled = 0
  const failed: { athleteId: string; reason: string }[] = []

  for (const athleteId of parsed.data.athleteIds) {
    const result = await createParticipationCore({
      showcaseId: parsed.data.showcaseId,
      athleteId,
      choreography: null,
      notes: null,
      auditUserId: userId,
    })
    if (result.ok) {
      enrolled += 1
    } else {
      failed.push({ athleteId, reason: result.error })
    }
  }

  revalidatePath(`${SHOWCASE_PATH}/${parsed.data.showcaseId}`)
  return { ok: true, data: { enrolled, failed } }
}

type CreateParticipationCoreParams = {
  showcaseId: string
  athleteId: string
  choreography: string | null
  notes: string | null
  auditUserId: string | null
}

async function createParticipationCore(
  params: CreateParticipationCoreParams,
): Promise<
  { ok: true; participationId: string } | { ok: false; error: string }
> {
  const showcase = await prisma.showcase.findFirst({
    where: { id: params.showcaseId, deletedAt: null },
    select: { id: true, title: true },
  })
  if (!showcase) return { ok: false, error: "Saggio non trovato" }

  const athlete = await prisma.athlete.findFirst({
    where: { id: params.athleteId, deletedAt: null },
    select: { id: true },
  })
  if (!athlete) return { ok: false, error: "Allieva non trovata" }

  const existing = await prisma.showcaseParticipation.findUnique({
    where: {
      showcaseId_athleteId: {
        showcaseId: params.showcaseId,
        athleteId: params.athleteId,
      },
    },
    select: { id: true },
  })
  if (existing) {
    return { ok: false, error: "Allieva già iscritta al saggio" }
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const participation = await tx.showcaseParticipation.create({
        data: {
          showcaseId: params.showcaseId,
          athleteId: params.athleteId,
          choreography: params.choreography,
          notes: params.notes,
        },
        select: { id: true },
      })

      if (params.auditUserId) {
        await tx.auditLog.create({
          data: {
            userId: params.auditUserId,
            action: "SHOWCASE_PARTICIPATION_CREATE",
            entityType: "ShowcaseParticipation",
            entityId: participation.id,
            changes: {
              showcaseId: params.showcaseId,
              athleteId: params.athleteId,
            } satisfies Prisma.InputJsonValue,
          },
        })
      }

      return participation
    })

    return { ok: true, participationId: created.id }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function confirmParticipation(
  values: ConfirmParticipationValues,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const parsed = confirmParticipationSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  const participation = await prisma.showcaseParticipation.findUnique({
    where: { id: parsed.data.participationId },
    select: {
      id: true,
      confirmed: true,
      paymentMode: true,
      showcase: {
        select: {
          id: true,
          title: true,
          deletedAt: true,
          academicYearId: true,
          firstInstallmentCents: true,
          secondInstallmentCents: true,
          firstDeadline: true,
          secondDeadline: true,
        },
      },
    },
  })
  if (!participation) return { ok: false, error: "Partecipazione non trovata" }
  if (participation.showcase.deletedAt) {
    return { ok: false, error: "Saggio nel cestino" }
  }
  // Idempotente: se già confermata con stessa modalità no-op
  if (participation.confirmed && participation.paymentMode === parsed.data.paymentMode) {
    return { ok: true }
  }
  if (participation.confirmed) {
    return {
      ok: false,
      error:
        "Partecipazione già confermata con modalità diversa: annulla e riconferma",
    }
  }

  const total =
    participation.showcase.firstInstallmentCents +
    participation.showcase.secondInstallmentCents

  // Edge: secondInstallment = 0 → SPLIT non ha senso, forziamo SINGLE
  const mode: PaymentMode =
    parsed.data.paymentMode === "SPLIT" &&
    participation.showcase.secondInstallmentCents === 0
      ? "SINGLE"
      : parsed.data.paymentMode

  try {
    await prisma.$transaction(async (tx) => {
      await tx.showcaseParticipation.update({
        where: { id: participation.id },
        data: {
          confirmed: true,
          confirmedAt: new Date(),
          paymentMode: mode,
        },
      })

      if (mode === "SINGLE") {
        await tx.paymentSchedule.create({
          data: {
            showcaseParticipationId: participation.id,
            academicYearId: participation.showcase.academicYearId,
            feeType: FeeType.SHOWCASE_1,
            dueDate: participation.showcase.firstDeadline,
            amountCents: total,
            status: ScheduleStatus.DUE,
            createdBy: userId,
            notes: `Saggio «${participation.showcase.title}» — Quota unica`,
          },
        })
      } else {
        await tx.paymentSchedule.createMany({
          data: [
            {
              showcaseParticipationId: participation.id,
              academicYearId: participation.showcase.academicYearId,
              feeType: FeeType.SHOWCASE_1,
              dueDate: participation.showcase.firstDeadline,
              amountCents: participation.showcase.firstInstallmentCents,
              status: ScheduleStatus.DUE,
              createdBy: userId,
              notes: `Saggio «${participation.showcase.title}» — Caparra`,
            },
            {
              showcaseParticipationId: participation.id,
              academicYearId: participation.showcase.academicYearId,
              feeType: FeeType.SHOWCASE_2,
              dueDate: participation.showcase.secondDeadline,
              amountCents: participation.showcase.secondInstallmentCents,
              status: ScheduleStatus.DUE,
              createdBy: userId,
              notes: `Saggio «${participation.showcase.title}» — Saldo`,
            },
          ],
        })
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: "SHOWCASE_PARTICIPATION_CONFIRM",
          entityType: "ShowcaseParticipation",
          entityId: participation.id,
          changes: {
            paymentMode: mode,
            totalCents: total,
          } satisfies Prisma.InputJsonValue,
        },
      })
    })

    revalidatePath(`${SHOWCASE_PATH}/${participation.showcase.id}`)
    revalidatePath(SCADENZE_PATH)
    revalidatePath(DASHBOARD_PATH)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function unconfirmParticipation(
  participationId: string,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(participationId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  const participation = await prisma.showcaseParticipation.findUnique({
    where: { id: idParsed.data },
    select: {
      id: true,
      confirmed: true,
      showcase: { select: { id: true } },
      paymentSchedules: {
        select: { id: true, status: true, paymentId: true },
      },
    },
  })
  if (!participation) return { ok: false, error: "Partecipazione non trovata" }
  if (!participation.confirmed) return { ok: true }

  const hasPaid = participation.paymentSchedules.some(
    (s) => s.status === ScheduleStatus.PAID || s.paymentId !== null,
  )
  if (hasPaid) {
    return {
      ok: false,
      error:
        "Pagamento già registrato: stornare prima il pagamento per annullare la conferma",
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const pendingIds = participation.paymentSchedules.map((s) => s.id)
      if (pendingIds.length > 0) {
        await tx.paymentSchedule.deleteMany({
          where: { id: { in: pendingIds } },
        })
      }
      await tx.showcaseParticipation.update({
        where: { id: participation.id },
        data: { confirmed: false, confirmedAt: null, paymentMode: null },
      })
      await tx.auditLog.create({
        data: {
          userId,
          action: "SHOWCASE_PARTICIPATION_CONFIRM",
          entityType: "ShowcaseParticipation",
          entityId: participation.id,
          changes: { unconfirmed: true } satisfies Prisma.InputJsonValue,
        },
      })
    })

    revalidatePath(`${SHOWCASE_PATH}/${participation.showcase.id}`)
    revalidatePath(SCADENZE_PATH)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function deleteParticipation(
  participationId: string,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(participationId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  const participation = await prisma.showcaseParticipation.findUnique({
    where: { id: idParsed.data },
    select: {
      id: true,
      showcase: { select: { id: true } },
      paymentSchedules: {
        select: { id: true, status: true, paymentId: true },
      },
      costumeAssignments: {
        select: { id: true, paid: true },
      },
    },
  })
  if (!participation) return { ok: false, error: "Partecipazione non trovata" }

  const hasPaidSchedule = participation.paymentSchedules.some(
    (s) => s.status === ScheduleStatus.PAID || s.paymentId !== null,
  )
  if (hasPaidSchedule) {
    return {
      ok: false,
      error:
        "Pagamento già registrato: impossibile rimuovere la partecipazione",
    }
  }
  const hasPaidCostume = participation.costumeAssignments.some((c) => c.paid)
  if (hasPaidCostume) {
    return {
      ok: false,
      error: "Costumi già pagati: impossibile rimuovere la partecipazione",
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const pendingIds = participation.paymentSchedules.map((s) => s.id)
      if (pendingIds.length > 0) {
        await tx.paymentSchedule.deleteMany({
          where: { id: { in: pendingIds } },
        })
      }
      // Costumi assignments non pagati possono essere rimossi
      if (participation.costumeAssignments.length > 0) {
        await tx.costumeAssignment.deleteMany({
          where: {
            id: { in: participation.costumeAssignments.map((c) => c.id) },
          },
        })
      }
      await tx.showcaseParticipation.delete({
        where: { id: participation.id },
      })
      await tx.auditLog.create({
        data: {
          userId,
          action: "SHOWCASE_PARTICIPATION_DELETE",
          entityType: "ShowcaseParticipation",
          entityId: participation.id,
          changes: {
            showcaseId: participation.showcase.id,
          } satisfies Prisma.InputJsonValue,
        },
      })
    })

    revalidatePath(`${SHOWCASE_PATH}/${participation.showcase.id}`)
    revalidatePath(SCADENZE_PATH)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function updateChoreography(
  values: UpdateChoreographyValues,
): Promise<ActionResult> {
  await requireAdmin()

  const parsed = updateChoreographySchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  const participation = await prisma.showcaseParticipation.findUnique({
    where: { id: parsed.data.participationId },
    select: { id: true, showcase: { select: { id: true } } },
  })
  if (!participation) return { ok: false, error: "Partecipazione non trovata" }

  try {
    await prisma.showcaseParticipation.update({
      where: { id: participation.id },
      data: { choreography: emptyToNull(parsed.data.choreography) },
    })
    revalidatePath(`${SHOWCASE_PATH}/${participation.showcase.id}`)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}
