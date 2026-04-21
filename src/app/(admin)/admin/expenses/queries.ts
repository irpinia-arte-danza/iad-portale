import { ExpenseType, PaymentMethod, Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"

type ListFilters = {
  search?: string
  type?: ExpenseType
  method?: PaymentMethod
  limit?: number
  offset?: number
}

const DEFAULT_LIMIT = 20

const expenseListItem = Prisma.validator<Prisma.ExpenseDefaultArgs>()({
  include: {
    fiscalYear: {
      select: { id: true, year: true, isCurrent: true },
    },
    academicYear: {
      select: { id: true, label: true, isCurrent: true },
    },
  },
})

export type ExpenseListItem = Prisma.ExpenseGetPayload<typeof expenseListItem>

export async function listExpenses(filters: ListFilters = {}) {
  await requireAdmin()

  const {
    search,
    type,
    method,
    limit = DEFAULT_LIMIT,
    offset = 0,
  } = filters

  const where: Prisma.ExpenseWhereInput = {
    deletedAt: null,
    ...(type ? { type } : {}),
    ...(method ? { method } : {}),
    ...(search && search.trim().length > 0
      ? {
          OR: [
            { recipient: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  }

  const [items, totalCount] = await Promise.all([
    prisma.expense.findMany({
      where,
      ...expenseListItem,
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
      take: limit,
      skip: offset,
    }),
    prisma.expense.count({ where }),
  ])

  return { items, totalCount }
}

const expenseWithRelations = Prisma.validator<Prisma.ExpenseDefaultArgs>()({
  include: {
    fiscalYear: {
      select: { id: true, year: true, isCurrent: true },
    },
    academicYear: {
      select: { id: true, label: true, isCurrent: true },
    },
  },
})

export type ExpenseWithRelations = Prisma.ExpenseGetPayload<
  typeof expenseWithRelations
>

export async function getExpenseById(
  id: string,
): Promise<ExpenseWithRelations | null> {
  await requireAdmin()

  return prisma.expense.findFirst({
    where: { id, deletedAt: null },
    ...expenseWithRelations,
  })
}
