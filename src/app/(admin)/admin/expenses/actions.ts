"use server"

import { revalidatePath } from "next/cache"

import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import type { ActionResult } from "@/lib/schemas/common"
import { uuidSchema } from "@/lib/schemas/common"
import {
  expenseCreateSchema,
  expenseUpdateSchema,
  type ExpenseCreateValues,
  type ExpenseUpdateValues,
} from "@/lib/schemas/expense"
import { fiscalYearForDate } from "@/lib/fiscal-years"
import { toDateOnly } from "@/lib/utils/date-only"
import { logError } from "@/lib/logging/log-error"
import { GENERIC_ERROR_MESSAGE } from "@/lib/errors"
import { logAudit } from "@/lib/audit/log-audit"
import { changedFields } from "@/lib/audit/changed-fields"

const EXPENSES_PATH = "/admin/expenses"

function mapPrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "Spesa duplicata"
    if (error.code === "P2003") return "Riferimento a record inesistente"
    if (error.code === "P2025") return "Spesa non trovata"
  }
  logError("[expenses action] unexpected error", error)
  return GENERIC_ERROR_MESSAGE
}

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

// Anni dalla data della spesa, non dagli anni "correnti": stipendi e F24 di
// luglio-agosto sono dell'anno fiscale ma di nessun anno accademico
// (settembre-giugno). `expenseDate` è già un giorno di calendario.
async function resolveYearIds(
  expenseDate: Date,
): Promise<{ fiscalYearId: string; academicYearId: string | null }> {
  const [fiscalYear, academicYear] = await Promise.all([
    fiscalYearForDate(expenseDate),
    prisma.academicYear.findFirst({
      where: {
        startDate: { lte: expenseDate },
        endDate: { gte: expenseDate },
      },
      orderBy: { startDate: "desc" },
      select: { id: true },
    }),
  ])

  return {
    fiscalYearId: fiscalYear.id,
    academicYearId: academicYear?.id ?? null,
  }
}

export async function registerExpense(
  values: ExpenseCreateValues,
): Promise<ActionResult<{ id: string }>> {
  const { userId } = await requireAdmin()

  const parsed = expenseCreateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  const expenseDate = toDateOnly(parsed.data.expenseDate)
  const amountCents = Math.round(parsed.data.amountEur * 100)

  try {
    const years = await resolveYearIds(expenseDate)
    const created = await prisma.expense.create({
      data: {
        fiscalYearId: years.fiscalYearId,
        academicYearId: years.academicYearId,
        type: parsed.data.type,
        amountCents,
        method: parsed.data.method,
        expenseDate,
        description: parsed.data.description,
        recipient: emptyToNull(parsed.data.recipient),
        notes: emptyToNull(parsed.data.notes),
      },
      select: { id: true },
    })

    await logAudit({
      userId,
      action: "EXPENSE_CREATE",
      entityType: "Expense",
      entityId: created.id,
      changes: { type: parsed.data.type, amountCents },
    })
    revalidatePath(EXPENSES_PATH)
    return { ok: true, data: { id: created.id } }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function updateExpense(
  expenseId: string,
  values: ExpenseUpdateValues,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(expenseId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo spesa non valido" }
  }

  const parsed = expenseUpdateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  const existing = await prisma.expense.findFirst({
    where: { id: idParsed.data, deletedAt: null },
  })
  if (!existing) {
    return { ok: false, error: "Spesa non trovata" }
  }

  const expenseDate = toDateOnly(parsed.data.expenseDate)
  const amountCents = Math.round(parsed.data.amountEur * 100)

  try {
    const years = await resolveYearIds(expenseDate)
    const data = {
        fiscalYearId: years.fiscalYearId,
        academicYearId: years.academicYearId,
        type: parsed.data.type,
        amountCents,
        method: parsed.data.method,
        expenseDate,
        description: parsed.data.description,
        recipient: emptyToNull(parsed.data.recipient),
        notes: emptyToNull(parsed.data.notes),
    }
    await prisma.expense.update({ where: { id: idParsed.data }, data })

    await logAudit({
      userId,
      action: "EXPENSE_UPDATE",
      entityType: "Expense",
      entityId: idParsed.data,
      changes: { fields: changedFields(existing, data), amountCents },
    })
    revalidatePath(EXPENSES_PATH)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function deleteExpense(
  expenseId: string,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(expenseId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo spesa non valido" }
  }

  const existing = await prisma.expense.findFirst({
    where: { id: idParsed.data, deletedAt: null },
    select: { id: true },
  })
  if (!existing) {
    return { ok: false, error: "Spesa non trovata" }
  }

  try {
    await prisma.expense.update({
      where: { id: idParsed.data },
      data: { deletedAt: new Date() },
    })

    await logAudit({
      userId,
      action: "EXPENSE_SOFT_DELETE",
      entityType: "Expense",
      entityId: idParsed.data,
      changes: undefined,
    })
    revalidatePath(EXPENSES_PATH)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}
