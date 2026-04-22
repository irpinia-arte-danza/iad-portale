import "server-only"

import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"

const emailLogRowArgs = Prisma.validator<Prisma.EmailLogDefaultArgs>()({
  select: {
    id: true,
    sentAt: true,
    deliveredAt: true,
    openedAt: true,
    bouncedAt: true,
    complainedAt: true,
    status: true,
    triggeredBy: true,
    milestoneKey: true,
    subject: true,
    bodyHtml: true,
    bodyText: true,
    recipientEmail: true,
    recipientName: true,
    templateSlug: true,
    providerId: true,
    errorMessage: true,
    athleteId: true,
    parentId: true,
    paymentScheduleId: true,
    sentByUser: {
      select: { id: true, firstName: true, lastName: true, email: true },
    },
    template: {
      select: { slug: true, name: true, category: true },
    },
  },
})

export type EmailLogRow = Prisma.EmailLogGetPayload<typeof emailLogRowArgs>

export async function getAthleteEmailLog(
  athleteId: string,
): Promise<EmailLogRow[]> {
  return prisma.emailLog.findMany({
    where: { athleteId },
    orderBy: { sentAt: "desc" },
    ...emailLogRowArgs,
  })
}

export async function getParentEmailLog(
  parentId: string,
): Promise<EmailLogRow[]> {
  return prisma.emailLog.findMany({
    where: { parentId },
    orderBy: { sentAt: "desc" },
    ...emailLogRowArgs,
  })
}
