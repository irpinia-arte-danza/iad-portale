import "server-only"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"

const TAKE = 200

export async function getDeletedAthletes() {
  await requireAdmin()
  return prisma.athlete.findMany({
    where: { deletedAt: { not: null } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      fiscalCode: true,
      deletedAt: true,
    },
    orderBy: { deletedAt: "desc" },
    take: TAKE,
  })
}

export async function getDeletedParents() {
  await requireAdmin()
  return prisma.parent.findMany({
    where: { deletedAt: { not: null } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      deletedAt: true,
    },
    orderBy: { deletedAt: "desc" },
    take: TAKE,
  })
}

export async function getDeletedTeachers() {
  await requireAdmin()
  return prisma.teacher.findMany({
    where: { deletedAt: { not: null } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      deletedAt: true,
    },
    orderBy: { deletedAt: "desc" },
    take: TAKE,
  })
}

export async function getDeletedCourses() {
  await requireAdmin()
  return prisma.course.findMany({
    where: { deletedAt: { not: null } },
    select: {
      id: true,
      name: true,
      type: true,
      isActive: true,
      deletedAt: true,
    },
    orderBy: { deletedAt: "desc" },
    take: TAKE,
  })
}

export async function getDeletedExpenses() {
  await requireAdmin()
  return prisma.expense.findMany({
    where: { deletedAt: { not: null } },
    select: {
      id: true,
      type: true,
      amountCents: true,
      expenseDate: true,
      description: true,
      deletedAt: true,
    },
    orderBy: { deletedAt: "desc" },
    take: TAKE,
  })
}

export async function getDeletedMedicalCertificates() {
  await requireAdmin()
  return prisma.medicalCertificate.findMany({
    where: { deletedAt: { not: null } },
    select: {
      id: true,
      type: true,
      issueDate: true,
      expiryDate: true,
      deletedAt: true,
      athlete: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { deletedAt: "desc" },
    take: TAKE,
  })
}

export async function getCestinoCounts() {
  await requireAdmin()
  const [athletes, parents, teachers, courses, expenses, certs] =
    await Promise.all([
      prisma.athlete.count({ where: { deletedAt: { not: null } } }),
      prisma.parent.count({ where: { deletedAt: { not: null } } }),
      prisma.teacher.count({ where: { deletedAt: { not: null } } }),
      prisma.course.count({ where: { deletedAt: { not: null } } }),
      prisma.expense.count({ where: { deletedAt: { not: null } } }),
      prisma.medicalCertificate.count({
        where: { deletedAt: { not: null } },
      }),
    ])
  return { athletes, parents, teachers, courses, expenses, certs }
}
