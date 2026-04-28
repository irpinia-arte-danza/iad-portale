import { NextResponse, type NextRequest } from "next/server"

import { UserRole } from "@prisma/client"

import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Auto-toggle isCurrent in base alla data odierna:
// - 0 AA copre oggi → skip + return warning (admin vede banner dashboard)
// - 1 AA copre oggi:
//     - se già current → skip idempotente
//     - se non current → transactional updateMany false + update target true
//                        + audit AY_AUTO_SET_CURRENT
// - N>1 overlap → skip + return warning (admin deve risolvere manualmente)
//
// Override manuale resta disponibile via setCurrentAcademicYear action.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get("authorization")
  const isVercelCron = req.headers.get("x-vercel-cron") === "1"
  const secret = process.env.CRON_SECRET
  const isDev = process.env.NODE_ENV === "development"

  // Dev bypass: in sviluppo locale (NODE_ENV=development) accettiamo
  // chiamate senza auth header per facilitare test da browser/curl.
  // In production il bypass è inattivo: serve sempre x-vercel-cron OR
  // Bearer ${CRON_SECRET}.
  if (!isDev) {
    if (!secret) {
      console.error("[cron/academic-year-rollover] CRON_SECRET not configured")
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

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  // Trova tutti gli AA che coprono oggi (startDate <= today <= endDate)
  const candidates = await prisma.academicYear.findMany({
    where: {
      startDate: { lte: today },
      endDate: { gte: today },
    },
    select: { id: true, label: true, isCurrent: true },
    orderBy: { startDate: "desc" },
  })

  if (candidates.length === 0) {
    // Cleanup edge case: nessun AA copre oggi MA esiste un AA con
    // isCurrent=true (stale, es. AA finito senza nuovo creato). Il
    // current va comunque azzerato perché è semanticamente errato che
    // un AA passato resti "corrente". Banner dashboard mostrerà
    // "missing" all'admin per intervento.
    const staleCurrent = await prisma.academicYear.findMany({
      where: { isCurrent: true },
      select: { id: true, label: true },
    })

    if (staleCurrent.length > 0) {
      const firstAdmin = await prisma.user.findFirst({
        where: { role: UserRole.ADMIN, isActive: true },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      })

      try {
        await prisma.$transaction([
          prisma.academicYear.updateMany({
            where: { isCurrent: true },
            data: { isCurrent: false },
          }),
          prisma.auditLog.create({
            data: {
              userId: firstAdmin?.id ?? null,
              action: "AY_AUTO_SET_CURRENT",
              entityType: "AcademicYear",
              entityId: null,
              changes: {
                action: "cleanup-stale",
                staleAYs: staleCurrent.map((s) => s.label),
                today: today.toISOString(),
              },
            },
          }),
        ])
      } catch (error) {
        console.error(
          "[cron/academic-year-rollover] stale cleanup transaction failed",
          error,
        )
        return NextResponse.json(
          { ok: false, error: "Stale cleanup failed" },
          { status: 500 },
        )
      }

      console.warn(
        "[cron/academic-year-rollover] cleaned stale isCurrent (no AY covers today)",
        {
          today: today.toISOString(),
          staleAYs: staleCurrent.map((s) => s.label),
        },
      )
      return NextResponse.json({
        ok: true,
        action: "cleaned-stale",
        reason: "no-academic-year-covers-today",
        cleanedAYs: staleCurrent.map((s) => s.label),
        today: today.toISOString(),
      })
    }

    console.warn(
      "[cron/academic-year-rollover] no academic year covers today",
      { today: today.toISOString() },
    )
    return NextResponse.json({
      ok: true,
      action: "skipped",
      reason: "no-academic-year-covers-today",
      today: today.toISOString(),
    })
  }

  if (candidates.length > 1) {
    console.warn(
      "[cron/academic-year-rollover] multiple academic years overlap today",
      {
        today: today.toISOString(),
        candidates: candidates.map((c) => ({ id: c.id, label: c.label })),
      },
    )
    return NextResponse.json({
      ok: true,
      action: "skipped",
      reason: "multiple-overlap",
      candidates: candidates.map((c) => c.label),
    })
  }

  const target = candidates[0]
  if (target.isCurrent) {
    return NextResponse.json({
      ok: true,
      action: "skipped",
      reason: "already-current",
      label: target.label,
    })
  }

  // Sender audit: primo admin attivo per createdAt asc (l'invocazione cron
  // non è user-driven; usiamo un "system admin" come actor per audit trail
  // visibile in dashboard).
  const firstAdmin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN, isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  })

  const previousCurrent = await prisma.academicYear.findFirst({
    where: { isCurrent: true, NOT: { id: target.id } },
    select: { id: true, label: true },
  })

  try {
    await prisma.$transaction([
      prisma.academicYear.updateMany({
        where: { isCurrent: true, NOT: { id: target.id } },
        data: { isCurrent: false },
      }),
      prisma.academicYear.update({
        where: { id: target.id },
        data: { isCurrent: true },
      }),
      prisma.auditLog.create({
        data: {
          userId: firstAdmin?.id ?? null,
          action: "AY_AUTO_SET_CURRENT",
          entityType: "AcademicYear",
          entityId: target.id,
          changes: {
            label: target.label,
            previousCurrent: previousCurrent?.label ?? null,
            today: today.toISOString(),
          },
        },
      }),
    ])
  } catch (error) {
    console.error("[cron/academic-year-rollover] transaction failed", error)
    return NextResponse.json(
      { ok: false, error: "Transaction failed" },
      { status: 500 },
    )
  }

  return NextResponse.json({
    ok: true,
    action: "promoted",
    label: target.label,
    previousCurrent: previousCurrent?.label ?? null,
  })
}
