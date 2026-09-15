"use server"

import { revalidatePath } from "next/cache"

import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import {
  registerPaymentCore,
  releasePaymentLinks,
  reversePaymentCore,
} from "@/lib/payments/register-payment"
import type { ActionResult } from "@/lib/schemas/common"
import { uuidSchema } from "@/lib/schemas/common"
import {
  paymentCreateSchema,
  paymentReverseSchema,
  paymentUpdateSchema,
  type PaymentCreateValues,
  type PaymentReverseValues,
  type PaymentUpdateValues,
} from "@/lib/schemas/payment"

import { getPaymentById, type PaymentWithRelations } from "./queries"

function mapPrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "Pagamento duplicato"
    if (error.code === "P2003") return "Riferimento a record inesistente"
    if (error.code === "P2025") return "Pagamento non trovato"
  }
  console.error("[payments action] unexpected error", error)
  return "Errore interno, riprova"
}

function athletePath(athleteId: string) {
  return `/admin/athletes/${athleteId}`
}

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

export async function getPaymentDetail(
  id: string,
): Promise<ActionResult<{ payment: PaymentWithRelations }>> {
  // Server action = endpoint POST: il controllo del layout admin non la protegge.
  await requireAdmin()

  const idParsed = uuidSchema.safeParse(id)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  try {
    const payment = await getPaymentById(idParsed.data)
    if (!payment) {
      return { ok: false, error: "Pagamento non trovato" }
    }
    return { ok: true, data: { payment } }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

// Una consegna di denaro: può chiudere più scadenze della stessa allieva.
// Regole in src/lib/payments/register-payment.ts.
export async function registerPayment(
  values: PaymentCreateValues,
): Promise<ActionResult<{ id: string; warnings: string[] }>> {
  const { userId } = await requireAdmin()

  const parsed = paymentCreateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  try {
    const result = await registerPaymentCore(parsed.data, { userId })
    if (!result.ok) return result

    revalidatePath("/admin/payments")
    revalidatePath("/admin/scadenze")
    revalidatePath(athletePath(parsed.data.athleteId))
    return { ok: true, data: { id: result.paymentId, warnings: result.warnings } }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function updatePayment(
  paymentId: string,
  values: PaymentUpdateValues,
): Promise<ActionResult> {
  await requireAdmin()

  const idParsed = uuidSchema.safeParse(paymentId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo pagamento non valido" }
  }

  const parsed = paymentUpdateSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  const existing = await prisma.payment.findFirst({
    where: { id: idParsed.data, deletedAt: null },
    select: { athleteId: true },
  })
  if (!existing) {
    return { ok: false, error: "Pagamento non trovato" }
  }

  try {
    await prisma.payment.update({
      where: { id: idParsed.data },
      data: { notes: emptyToNull(parsed.data.notes) },
    })
    revalidatePath("/admin/payments")
    revalidatePath(athletePath(existing.athleteId))
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function deletePayment(
  paymentId: string,
): Promise<ActionResult> {
  await requireAdmin()

  const idParsed = uuidSchema.safeParse(paymentId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo pagamento non valido" }
  }

  const existing = await prisma.payment.findFirst({
    where: { id: idParsed.data, deletedAt: null },
    select: {
      athleteId: true,
      receipt: { select: { receiptNumber: true } },
    },
  })
  if (!existing) {
    return { ok: false, error: "Pagamento non trovato" }
  }
  // Numerazione fiscale senza buchi: con una ricevuta emessa (anche
  // annullata) il pagamento non si elimina, si storna.
  if (existing.receipt) {
    return {
      ok: false,
      error: `Il pagamento ha la ricevuta n. ${existing.receipt.receiptNumber}: non si può eliminare. Usa «Storna pagamento», che annulla la ricevuta mantenendo il numero.`,
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Tutte le scadenze e le iscrizioni del pagamento tornano da pagare
      await releasePaymentLinks(tx, idParsed.data)
      await tx.payment.update({
        where: { id: idParsed.data },
        data: { deletedAt: new Date() },
      })
    })

    revalidatePath("/admin/payments")
    revalidatePath("/admin/scadenze")
    revalidatePath(athletePath(existing.athleteId))
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function reversePayment(
  paymentId: string,
  values: PaymentReverseValues,
): Promise<ActionResult<{ cancelledReceiptNumber: string | null }>> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(paymentId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo pagamento non valido" }
  }

  const parsed = paymentReverseSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  try {
    const result = await reversePaymentCore({
      paymentId: idParsed.data,
      userId,
      reason: parsed.data.reversalReason,
    })
    if (!result.ok) return result

    revalidatePath("/admin/payments")
    revalidatePath("/admin/receipts")
    revalidatePath("/admin/scadenze")
    revalidatePath(athletePath(result.athleteId))
    return {
      ok: true,
      data: { cancelledReceiptNumber: result.cancelledReceiptNumber },
    }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}
