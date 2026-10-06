import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/auth/require-admin"
import { generateAnnualBundle } from "@/lib/zip/annual-bundle"
import { logAudit } from "@/lib/audit/log-audit"
import { GENERIC_ERROR_MESSAGE } from "@/lib/errors"
import { logError } from "@/lib/logging/log-error"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteParams = {
  params: Promise<{ year: string }>
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { userId } = await requireAdmin()

  const { year: yearParam } = await params
  const year = Number.parseInt(yearParam, 10)

  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    return NextResponse.json(
      { error: "Anno non valido" },
      { status: 400 },
    )
  }

  try {
    const { buffer, filename } = await generateAnnualBundle(year)
    const body = new Uint8Array(buffer)

    // Export di tutti i dati contabili dell'anno: si segna chi l'ha fatto
    await logAudit({
      userId,
      action: "ANNUAL_EXPORT",
      entityType: "AnnualExport",
      entityId: String(year),
      changes: { year, bytes: body.byteLength },
    })

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(body.byteLength),
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    logError("[annual bundle] generation failed", error, { year })
    return NextResponse.json(
      { error: GENERIC_ERROR_MESSAGE },
      { status: 500 },
    )
  }
}
