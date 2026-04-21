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

import { getExpenseById, type ExpenseWithRelations } from "./queries"

const EXPENSES_PATH = "/admin/expenses"

function mapPrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "Spesa duplicata"
    if (error.code === "P2003") return "Riferimento a record inesistente"
    if (error.code === "P2025") return "Spesa non trovata"
  }
  console.error("[expenses action] unexpected error", error)
  return "Errore interno, riprova"
}

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

async function resolveYearIds(expenseDate: Date): Promise<
  | { ok: true; fiscalYearId: string; academicYearId: string | null }
  | { ok: false; error: string }
> {
  const [currentFY, currentAY] = await Promise.all([
    prisma.fiscalYear.findFirst({
      where: { isCurrent: true },
      select: { id: true },
    }),
    prisma.academicYear.findFirst({
      where: { isCurrent: true },
      select: { id: true, startDate: true, endDate: true },
    }),
  ])

  if (!currentFY) {
    return { ok: false, error: "Nessun anno fiscale corrente configurato" }
  }

  const inAyWindow =
    currentAY !== null &&
    expenseDate >= currentAY.startDate &&
    expenseDate <= currentAY.endDate

  return {
    ok: true,
    fiscalYearId: currentFY.id,
    academicYearId: inAyWindow ? currentAY!.id : null,
  }
}

export async function getExpenseDetail(
  id: string,
): Promise<ActionResult<{ expense: ExpenseWithRelations }>> {
  const idParsed = uuidSchema.safeParse(id)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  try {
    const expense = await getExpenseById(idParsed.data)
    if (!expense) {
      return { ok: false, error: "Spesa non trovata" }
    }
    return { ok: true, data: { expense } }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function registerExpense(
  values: ExpenseCreateValues,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin()

  const parsed = expenseCreateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  const years = await resolveYearIds(parsed.data.expenseDate)
  if (!years.ok) {
    return { ok: false, error: years.error }
  }

  const amountCents = Math.round(parsed.data.amountEur * 100)

  try {
    const created = await prisma.expense.create({
      data: {
        fiscalYearId: years.fiscalYearId,
        academicYearId: years.academicYearId,
        type: parsed.data.type,
        amountCents,
        method: parsed.data.method,
        expenseDate: parsed.data.expenseDate,
        description: parsed.data.description,
        recipient: emptyToNull(parsed.data.recipient),
        notes: emptyToNull(parsed.data.notes),
      },
      select: { id: true },
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
  await requireAdmin()

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
    select: { id: true },
  })
  if (!existing) {
    return { ok: false, error: "Spesa non trovata" }
  }

  const years = await resolveYearIds(parsed.data.expenseDate)
  if (!years.ok) {
    return { ok: false, error: years.error }
  }

  const amountCents = Math.round(parsed.data.amountEur * 100)

  try {
    await prisma.expense.update({
      where: { id: idParsed.data },
      data: {
        fiscalYearId: years.fiscalYearId,
        academicYearId: years.academicYearId,
        type: parsed.data.type,
        amountCents,
        method: parsed.data.method,
        expenseDate: parsed.data.expenseDate,
        description: parsed.data.description,
        recipient: emptyToNull(parsed.data.recipient),
        notes: emptyToNull(parsed.data.notes),
      },
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
  await requireAdmin()

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

    revalidatePath(EXPENSES_PATH)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}
