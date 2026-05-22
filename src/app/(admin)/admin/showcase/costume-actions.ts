"use server"

import { revalidatePath } from "next/cache"

import { FeeType, Prisma, ScheduleStatus } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import type { ActionResult } from "@/lib/schemas/common"
import { uuidSchema } from "@/lib/schemas/common"
import {
  assignCostumeSchema,
  costumeCreateSchema,
  costumeUpdateSchema,
  updateAssignmentSizeSchema,
  type AssignCostumeValues,
  type CostumeCreateValues,
  type CostumeUpdateValues,
  type UpdateAssignmentSizeValues,
} from "@/lib/schemas/costume"

const SHOWCASE_PATH = "/admin/showcase"
const DASHBOARD_PATH = "/admin/dashboard"
const SCADENZE_PATH = "/admin/scadenze"

function mapPrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "Duplicato"
    if (error.code === "P2003") return "Riferimento a record inesistente"
    if (error.code === "P2025") return "Risorsa non trovata"
  }
  console.error("[costume action] unexpected error", error)
  return "Errore interno, riprova"
}

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

// ─────────────────────────────────────────────────────────────────────────
// CRUD Costume
// ─────────────────────────────────────────────────────────────────────────

export async function createCostume(
  values: CostumeCreateValues,
): Promise<ActionResult<{ id: string }>> {
  const { userId } = await requireAdmin()

  const parsed = costumeCreateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  const showcase = await prisma.showcase.findUnique({
    where: { id: parsed.data.showcaseId },
    select: { id: true, deletedAt: true },
  })
  if (!showcase) return { ok: false, error: "Saggio non trovato" }
  if (showcase.deletedAt) {
    return { ok: false, error: "Saggio nel cestino: ripristinalo per modificarlo" }
  }

  try {
    const costume = await prisma.costume.create({
      data: {
        showcaseId: parsed.data.showcaseId,
        name: parsed.data.name,
        description: emptyToNull(parsed.data.description),
        costCents: Math.round(parsed.data.costEur * 100),
      },
      select: { id: true },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "COSTUME_CREATE",
        entityType: "Costume",
        entityId: costume.id,
        changes: {
          showcaseId: parsed.data.showcaseId,
          name: parsed.data.name,
          costCents: Math.round(parsed.data.costEur * 100),
        } satisfies Prisma.InputJsonValue,
      },
    })

    revalidatePath(`${SHOWCASE_PATH}/${parsed.data.showcaseId}`)
    revalidatePath(DASHBOARD_PATH)
    return { ok: true, data: { id: costume.id } }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function updateCostume(
  costumeId: string,
  values: CostumeUpdateValues,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(costumeId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }
  const parsed = costumeUpdateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  const costume = await prisma.costume.findUnique({
    where: { id: idParsed.data },
    select: { id: true, showcaseId: true, deletedAt: true },
  })
  if (!costume) return { ok: false, error: "Costume non trovato" }
  if (costume.deletedAt) {
    return { ok: false, error: "Costume nel cestino: ripristinalo per modificarlo" }
  }

  try {
    await prisma.costume.update({
      where: { id: costume.id },
      data: {
        name: parsed.data.name,
        description: emptyToNull(parsed.data.description),
        costCents: Math.round(parsed.data.costEur * 100),
      },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "COSTUME_UPDATE",
        entityType: "Costume",
        entityId: costume.id,
        changes: {
          name: parsed.data.name,
          costCents: Math.round(parsed.data.costEur * 100),
        } satisfies Prisma.InputJsonValue,
      },
    })

    revalidatePath(`${SHOWCASE_PATH}/${costume.showcaseId}`)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function softDeleteCostume(
  costumeId: string,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(costumeId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  const costume = await prisma.costume.findUnique({
    where: { id: idParsed.data },
    select: {
      id: true,
      showcaseId: true,
      deletedAt: true,
      assignments: { select: { id: true } },
    },
  })
  if (!costume) return { ok: false, error: "Costume non trovato" }
  if (costume.deletedAt) return { ok: true }
  if (costume.assignments.length > 0) {
    return {
      ok: false,
      error:
        "Rimuovi prima le assegnazioni per poter cestinare il costume",
    }
  }

  try {
    await prisma.costume.update({
      where: { id: costume.id },
      data: { deletedAt: new Date() },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "COSTUME_DELETE",
        entityType: "Costume",
        entityId: costume.id,
        changes: {
          showcaseId: costume.showcaseId,
        } satisfies Prisma.InputJsonValue,
      },
    })

    revalidatePath(`${SHOWCASE_PATH}/${costume.showcaseId}`)
    revalidatePath("/admin/cestino")
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// CostumeAssignment: assign / unassign / update size
// ─────────────────────────────────────────────────────────────────────────

export async function assignCostume(
  values: AssignCostumeValues,
): Promise<ActionResult<{ id: string }>> {
  const { userId } = await requireAdmin()

  const parsed = assignCostumeSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  const [costume, participation] = await Promise.all([
    prisma.costume.findUnique({
      where: { id: parsed.data.costumeId },
      select: {
        id: true,
        name: true,
        costCents: true,
        deletedAt: true,
        showcaseId: true,
        showcase: {
          select: {
            id: true,
            deletedAt: true,
            academicYearId: true,
            firstDeadline: true,
          },
        },
      },
    }),
    prisma.showcaseParticipation.findUnique({
      where: { id: parsed.data.participationId },
      select: {
        id: true,
        showcaseId: true,
        athlete: {
          select: { firstName: true, lastName: true, deletedAt: true },
        },
      },
    }),
  ])

  if (!costume) return { ok: false, error: "Costume non trovato" }
  if (costume.deletedAt) return { ok: false, error: "Costume nel cestino" }
  if (costume.showcase.deletedAt) {
    return { ok: false, error: "Saggio nel cestino" }
  }
  if (!participation) return { ok: false, error: "Partecipazione non trovata" }
  if (participation.showcaseId !== costume.showcaseId) {
    return { ok: false, error: "Partecipazione di un altro saggio" }
  }
  if (participation.athlete.deletedAt) {
    return { ok: false, error: "Allieva nel cestino" }
  }

  const athleteLabel =
    `${participation.athlete.firstName} ${participation.athlete.lastName}`.trim()
  const scheduleNote = `Costume «${costume.name}» — ${athleteLabel}`

  try {
    const assignment = await prisma.$transaction(async (tx) => {
      const created = await tx.costumeAssignment.create({
        data: {
          costumeId: costume.id,
          participationId: participation.id,
          size: emptyToNull(parsed.data.size),
        },
        select: { id: true },
      })

      if (costume.costCents > 0) {
        await tx.paymentSchedule.create({
          data: {
            costumeAssignmentId: created.id,
            academicYearId: costume.showcase.academicYearId,
            feeType: FeeType.COSTUME,
            dueDate: costume.showcase.firstDeadline,
            amountCents: costume.costCents,
            status: ScheduleStatus.DUE,
            createdBy: userId,
            notes: scheduleNote,
          },
        })
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: "COSTUME_ASSIGN",
          entityType: "CostumeAssignment",
          entityId: created.id,
          changes: {
            costumeId: costume.id,
            participationId: participation.id,
            size: emptyToNull(parsed.data.size),
            amountCents: costume.costCents,
          } satisfies Prisma.InputJsonValue,
        },
      })

      return created
    })

    revalidatePath(`${SHOWCASE_PATH}/${costume.showcaseId}`)
    revalidatePath(SCADENZE_PATH)
    revalidatePath(DASHBOARD_PATH)
    return { ok: true, data: { id: assignment.id } }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function unassignCostume(
  assignmentId: string,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(assignmentId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  const assignment = await prisma.costumeAssignment.findUnique({
    where: { id: idParsed.data },
    select: {
      id: true,
      paid: true,
      costume: { select: { showcaseId: true } },
      paymentSchedule: {
        select: { id: true, status: true, paymentId: true },
      },
    },
  })
  if (!assignment) return { ok: false, error: "Assegnazione non trovata" }

  if (assignment.paid) {
    return {
      ok: false,
      error:
        "Costume già pagato: storna prima il pagamento per rimuovere l'assegnazione",
    }
  }
  const schedule = assignment.paymentSchedule
  if (
    schedule &&
    (schedule.status === ScheduleStatus.PAID || schedule.paymentId !== null)
  ) {
    return {
      ok: false,
      error: "Pagamento già registrato: storna prima il pagamento",
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (schedule) {
        await tx.paymentSchedule.delete({ where: { id: schedule.id } })
      }
      await tx.costumeAssignment.delete({ where: { id: assignment.id } })
      await tx.auditLog.create({
        data: {
          userId,
          action: "COSTUME_UNASSIGN",
          entityType: "CostumeAssignment",
          entityId: assignment.id,
          changes: {} satisfies Prisma.InputJsonValue,
        },
      })
    })

    revalidatePath(`${SHOWCASE_PATH}/${assignment.costume.showcaseId}`)
    revalidatePath(SCADENZE_PATH)
    revalidatePath(DASHBOARD_PATH)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function updateAssignmentSize(
  values: UpdateAssignmentSizeValues,
): Promise<ActionResult> {
  await requireAdmin()

  const parsed = updateAssignmentSizeSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  const assignment = await prisma.costumeAssignment.findUnique({
    where: { id: parsed.data.assignmentId },
    select: {
      id: true,
      costume: { select: { showcaseId: true } },
    },
  })
  if (!assignment) return { ok: false, error: "Assegnazione non trovata" }

  try {
    await prisma.costumeAssignment.update({
      where: { id: assignment.id },
      data: { size: emptyToNull(parsed.data.size) },
    })

    revalidatePath(`${SHOWCASE_PATH}/${assignment.costume.showcaseId}`)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}
