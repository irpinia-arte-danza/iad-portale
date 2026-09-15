import { NextResponse, type NextRequest } from "next/server"

import { prisma } from "@/lib/prisma"
import { archiveReceiptPdf } from "@/lib/receipts/receipt-pdf-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

const LOG_PREFIX = "[cron/receipt-pdfs]"
const BATCH_SIZE = 25

// Archivia i PDF delle ricevute rimaste senza file: emissioni con Storage
// irraggiungibile e ricevute emesse prima dell'archivio. Gira prima del backup
// notturno (01:37 UTC) così i file entrano nella copia della stessa notte.
// Idempotente: una ricevuta con file archiviato non viene mai rigenerata.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get("authorization")
  const isVercelCron = req.headers.get("x-vercel-cron") === "1"
  const secret = process.env.CRON_SECRET
  const isDev = process.env.NODE_ENV === "development"

  // Dev bypass come negli altri cron: in production serve x-vercel-cron OR
  // Bearer ${CRON_SECRET}
  if (!isDev) {
    if (!secret) {
      console.error(`${LOG_PREFIX} CRON_SECRET not configured`)
      return NextResponse.json(
        { ok: false, error: "CRON_SECRET not configured" },
        { status: 500 },
      )
    }

    const authorized = isVercelCron || authHeader === `Bearer ${secret}`
    if (!authorized) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      )
    }
  }

  const pending = await prisma.receipt.findMany({
    where: { pdfPath: null },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
    select: { id: true, receiptNumber: true },
  })

  let archived = 0
  const failed: string[] = []
  for (const receipt of pending) {
    if (await archiveReceiptPdf(receipt.id)) archived++
    else failed.push(receipt.receiptNumber)
  }

  const remaining = await prisma.receipt.count({ where: { pdfPath: null } })

  if (failed.length > 0) {
    console.error(`${LOG_PREFIX} receipts not archived`, { failed, remaining })
  }

  return NextResponse.json(
    {
      ok: failed.length === 0,
      checked: pending.length,
      archived,
      failed,
      remaining,
    },
    { status: failed.length === 0 ? 200 : 500 },
  )
}
