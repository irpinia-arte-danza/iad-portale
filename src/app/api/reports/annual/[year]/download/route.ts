import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/auth/require-admin"
import { generateAnnualBundle } from "@/lib/zip/annual-bundle"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteParams = {
  params: Promise<{ year: string }>
}

export async function GET(_req: Request, { params }: RouteParams) {
  await requireAdmin()

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
    console.error("[annual bundle] generation failed", { year })
    const message =
      error instanceof Error ? error.message : "Errore sconosciuto"
    return NextResponse.json(
      { error: message },
      { status: 500 },
    )
  }
}
