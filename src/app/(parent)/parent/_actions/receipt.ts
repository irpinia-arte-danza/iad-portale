"use server"

import { renderToBuffer } from "@react-pdf/renderer"
import { ReceiptCategory, type FeeType } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireParent } from "@/lib/auth/require-parent"
import {
  ReceiptPdf,
  type ReceiptBrand,
  type ReceiptData,
} from "@/lib/pdf/components/receipt"
import type { ActionResult } from "@/lib/schemas/common"
import { uuidSchema } from "@/lib/schemas/common"

function feeTypeToCategory(feeType: FeeType): ReceiptCategory {
  if (feeType === "SHOWCASE_1" || feeType === "SHOWCASE_2") {
    return ReceiptCategory.SHOWCASE
  }
  if (feeType === "COSTUME") return ReceiptCategory.COSTUME
  return ReceiptCategory.REGULAR
}

function categorySuffix(category: ReceiptCategory): string {
  if (category === ReceiptCategory.SHOWCASE) return "/S"
  if (category === ReceiptCategory.COSTUME) return "/C"
  return ""
}

// Trasforma "2025-2026" → "2025-26"
function compactAcademicYear(label: string): string {
  const parts = label.split("-")
  if (parts.length !== 2) return label
  const [start, end] = parts
  return `${start}-${end.slice(-2)}`
}

function composeAddress(p: {
  residenceStreet: string | null
  residenceNumber: string | null
  residenceCap: string | null
  residenceCity: string | null
  residenceProvince: string | null
}): string | null {
  const street = [p.residenceStreet, p.residenceNumber]
    .filter(Boolean)
    .join(" ")
    .trim()
  const place = [p.residenceCap, p.residenceCity, p.residenceProvince ? `(${p.residenceProvince})` : null]
    .filter(Boolean)
    .join(" ")
    .trim()
  const full = [street, place].filter((p) => p.length > 0).join(" — ")
  return full.length > 0 ? full : null
}

export async function generatePaymentReceipt(
  paymentId: string,
): Promise<
  ActionResult<{ base64: string; filename: string; receiptNumber: string }>
> {
  const { parentId } = await requireParent()

  const idParsed = uuidSchema.safeParse(paymentId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo pagamento non valido" }
  }

  // Security: verifica payment + ownership via AthleteParent
  const payment = await prisma.payment.findFirst({
    where: {
      id: idParsed.data,
      status: "PAID",
      deletedAt: null,
      athlete: {
        parentRelations: { some: { parentId } },
      },
    },
    select: {
      id: true,
      feeType: true,
      amountCents: true,
      method: true,
      paymentDate: true,
      periodStart: true,
      periodEnd: true,
      notes: true,
      academicYear: { select: { id: true, label: true } },
      athlete: {
        select: {
          firstName: true,
          lastName: true,
          fiscalCode: true,
        },
      },
      parent: {
        select: {
          firstName: true,
          lastName: true,
          fiscalCode: true,
          residenceStreet: true,
          residenceNumber: true,
          residenceCap: true,
          residenceCity: true,
          residenceProvince: true,
        },
      },
      receipt: {
        select: {
          id: true,
          receiptNumber: true,
          category: true,
          issueDate: true,
        },
      },
    },
  })

  if (!payment) {
    return { ok: false, error: "Pagamento non trovato o non accessibile" }
  }

  // Pagante: usa parent collegato al Payment, fallback al genitore
  // loggato (caso edge: Payment.parentId null perché contestualizzato
  // solo all'allieva)
  let payerProfile = payment.parent
  if (!payerProfile) {
    payerProfile = await prisma.parent.findUnique({
      where: { id: parentId },
      select: {
        firstName: true,
        lastName: true,
        fiscalCode: true,
        residenceStreet: true,
        residenceNumber: true,
        residenceCap: true,
        residenceCity: true,
        residenceProvince: true,
      },
    })
  }

  if (!payerProfile) {
    return { ok: false, error: "Profilo pagante non disponibile" }
  }

  const brand = await prisma.brandSettings.findUnique({
    where: { id: 1 },
    select: {
      asdName: true,
      asdFiscalCode: true,
      asdVatNumber: true,
      asdEmail: true,
      asdPhone: true,
      asdIban: true,
      addressStreet: true,
      addressZip: true,
      addressCity: true,
      addressProvince: true,
      asdAddress: true,
      logoUrl: true,
      logoSvgUrl: true,
    },
  })

  if (!brand) {
    return { ok: false, error: "Dati ASD mancanti, contatta l'amministratore" }
  }

  const receiptSettings = await prisma.receiptSettings.findUnique({
    where: { id: 1 },
    select: { receiptPrefix: true, receiptFooter: true },
  })

  const prefix = receiptSettings?.receiptPrefix ?? "IAD/"
  const ayCompact = compactAcademicYear(payment.academicYear.label)

  // Numerazione: se Receipt già emessa per questo Payment, riusa.
  // Altrimenti increment atomico ReceiptSettings + create Receipt.
  let receiptNumber: string
  let issueDate: Date

  if (payment.receipt) {
    receiptNumber = payment.receipt.receiptNumber
    issueDate = payment.receipt.issueDate
  } else {
    const category = feeTypeToCategory(payment.feeType)
    const suffix = categorySuffix(category)

    try {
      const created = await prisma.$transaction(async (tx) => {
        const updated = await tx.receiptSettings.update({
          where: { id: 1 },
          data: { receiptNumber: { increment: 1 } },
          select: { receiptNumber: true },
        })
        const number = `${prefix}${ayCompact}/${String(updated.receiptNumber).padStart(3, "0")}${suffix}`
        const r = await tx.receipt.create({
          data: {
            paymentId: payment.id,
            category,
            receiptNumber: number,
            issueDate: new Date(),
          },
          select: { receiptNumber: true, issueDate: true },
        })
        return r
      })
      receiptNumber = created.receiptNumber
      issueDate = created.issueDate
    } catch (error) {
      console.error("[receipt] numbering failed", error)
      return { ok: false, error: "Errore generazione numero ricevuta" }
    }
  }

  const receiptData: ReceiptData = {
    receiptNumber,
    issueDate,
    payerName: `${payerProfile.firstName} ${payerProfile.lastName}`,
    payerFiscalCode: payerProfile.fiscalCode,
    payerAddress: composeAddress(payerProfile),
    athleteName: `${payment.athlete.firstName} ${payment.athlete.lastName}`,
    athleteFiscalCode: payment.athlete.fiscalCode,
    feeType: payment.feeType,
    description: payment.notes,
    periodStart: payment.periodStart,
    periodEnd: payment.periodEnd,
    amountCents: payment.amountCents,
    method: payment.method,
    paymentDate: payment.paymentDate,
    receiptFooter: receiptSettings?.receiptFooter ?? null,
  }

  const brandData: ReceiptBrand = {
    asdName: brand.asdName,
    asdFiscalCode: brand.asdFiscalCode,
    asdVatNumber: brand.asdVatNumber,
    asdEmail: brand.asdEmail,
    asdPhone: brand.asdPhone,
    asdIban: brand.asdIban,
    addressStreet: brand.addressStreet,
    addressZip: brand.addressZip,
    addressCity: brand.addressCity,
    addressProvince: brand.addressProvince,
    asdAddress: brand.asdAddress,
    logoUrl: brand.logoUrl,
    logoSvgUrl: brand.logoSvgUrl,
  }

  try {
    const buffer = await renderToBuffer(
      ReceiptPdf({ receipt: receiptData, brand: brandData }),
    )
    const base64 = Buffer.from(buffer).toString("base64")
    const safeNumber = receiptNumber.replace(/[/\\]/g, "_")
    return {
      ok: true,
      data: {
        base64,
        filename: `Ricevuta_${safeNumber}.pdf`,
        receiptNumber,
      },
    }
  } catch (error) {
    console.error("[receipt] render failed", error)
    return { ok: false, error: "Errore generazione PDF" }
  }
}
