"use server"

import { revalidatePath } from "next/cache"

import { AuditAction, Prisma } from "@prisma/client"

import { requireAdmin } from "@/lib/auth/require-admin"
import { prisma } from "@/lib/prisma"
import type { ActionResult } from "@/lib/schemas/common"
import {
  emailTemplateEditSchema,
  type EmailTemplateEditInput,
} from "@/lib/schemas/email-template"

export async function listEmailTemplates() {
  await requireAdmin()
  return prisma.emailTemplate.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  })
}

export async function getEmailTemplate(slug: string) {
  await requireAdmin()
  return prisma.emailTemplate.findUnique({ where: { slug } })
}

function diffTemplate(
  before: {
    subject: string
    bodyHtml: string
    bodyText: string | null
    isActive: boolean
  },
  after: EmailTemplateEditInput,
): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {}
  const keys: (keyof EmailTemplateEditInput)[] = [
    "subject",
    "bodyHtml",
    "bodyText",
    "isActive",
  ]
  for (const key of keys) {
    const b = before[key] ?? null
    const a = after[key] ?? null
    if (b !== a) {
      diff[key] = { from: b, to: a }
    }
  }
  return diff
}

export async function updateEmailTemplate(
  slug: string,
  input: EmailTemplateEditInput,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const parsed = emailTemplateEditSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  try {
    const before = await prisma.emailTemplate.findUnique({
      where: { slug },
      select: {
        subject: true,
        bodyHtml: true,
        bodyText: true,
        isActive: true,
      },
    })

    if (!before) {
      return { ok: false, error: "Template non trovato" }
    }

    const changes = diffTemplate(before, parsed.data)

    await prisma.emailTemplate.update({
      where: { slug },
      data: {
        subject: parsed.data.subject,
        bodyHtml: parsed.data.bodyHtml,
        bodyText: parsed.data.bodyText ?? null,
        isActive: parsed.data.isActive,
        updatedBy: userId,
      },
    })

    if (Object.keys(changes).length > 0) {
      try {
        await prisma.auditLog.create({
          data: {
            userId,
            action: AuditAction.UPDATE,
            entityType: "EmailTemplate",
            entityId: slug,
            changes: changes as Prisma.InputJsonValue,
          },
        })
      } catch (auditErr) {
        console.error("[audit] updateEmailTemplate failed", auditErr)
      }
    }

    revalidatePath("/admin/email-templates")
    revalidatePath(`/admin/email-templates/${slug}`)
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Errore aggiornamento",
    }
  }
}
