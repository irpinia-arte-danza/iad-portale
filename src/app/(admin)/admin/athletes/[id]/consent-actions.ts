"use server"

import { revalidatePath } from "next/cache"

import { ConsentMethod, Prisma, type ConsentType } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import type { ActionResult } from "@/lib/schemas/common"
import { uuidSchema } from "@/lib/schemas/common"
import {
  consentSchema,
  SIGNED_BY_ATHLETE,
  type ConsentValues,
} from "@/lib/schemas/consent"
import { isMinorAt } from "@/lib/utils/age"
import { toDateOnly } from "@/lib/utils/date-only"

// ─────────────────────────────────────────────────────────────────────────
// Consensi cartacei: la segreteria registra la firma sul modulo di carta.
//
// Il modulo resta in archivio; qui si scrive che c'è, quando è stato
// firmato e da chi. Niente firma online, niente IP: method è sempre PAPER.
// Cancellare vuol dire Cestino (deletedAt), con ripristino: un consenso
// registrato per sbaglio si toglie, uno tolto per sbaglio si rimette, e
// nessuna delle due cose cancella una riga.
// ─────────────────────────────────────────────────────────────────────────

function mapPrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2003") return "Allieva non trovata"
    if (error.code === "P2025") return "Consenso non trovato"
  }
  console.error("[consent action] error", error)
  return "Errore interno, riprova"
}

// Scheda, elenco (chip «Senza consenso privacy») e dashboard (riquadro)
function revalidateAthlete(athleteId: string) {
  revalidatePath(`/admin/athletes/${athleteId}`)
  revalidatePath("/admin/athletes")
  revalidatePath("/admin/dashboard")
}

export async function createConsent(
  athleteId: string,
  input: ConsentValues,
): Promise<ActionResult<{ id: string }>> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(athleteId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo allieva non valido" }
  }
  const parsed = consentSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }
  const values = parsed.data

  try {
    const athlete = await prisma.athlete.findUnique({
      where: { id: idParsed.data, deletedAt: null },
      select: {
        id: true,
        dateOfBirth: true,
        parentRelations: {
          where: { parent: { deletedAt: null } },
          select: { parentId: true },
        },
      },
    })
    if (!athlete) return { ok: false, error: "Allieva non trovata" }

    // Chi firma: un genitore collegato, oppure l'allieva se maggiorenne. Il
    // controllo sta qui e non solo nel form: l'id arriva dal client.
    let parentId: string | null = null
    if (values.signedBy === SIGNED_BY_ATHLETE) {
      if (isMinorAt(athlete.dateOfBirth, new Date())) {
        return {
          ok: false,
          error: "È minorenne: il consenso lo firma un genitore",
        }
      }
    } else {
      const signer = uuidSchema.safeParse(values.signedBy)
      const linked =
        signer.success &&
        athlete.parentRelations.some((r) => r.parentId === signer.data)
      if (!linked) {
        return {
          ok: false,
          error: "Chi ha firmato deve essere un genitore collegato",
        }
      }
      parentId = signer.data as string
    }

    // La versione del documento: l'anno accademico in cui è stato firmato,
    // che è anche l'anno del modulo di iscrizione
    const signedOn = toDateOnly(values.signedOn)
    const year = await prisma.academicYear.findFirst({
      where: { startDate: { lte: signedOn }, endDate: { gte: signedOn } },
      select: { label: true },
    })

    const consent = await prisma.consent.create({
      data: {
        athleteId: athlete.id,
        parentId,
        type: values.kind as ConsentType,
        accepted: true,
        documentVersion: year?.label ?? String(signedOn.getUTCFullYear()),
        method: ConsentMethod.PAPER,
        acceptedAt: signedOn,
        notes: values.notes && values.notes !== "" ? values.notes : null,
      },
      select: { id: true },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "CREATE",
        entityType: "Consent",
        entityId: consent.id,
        changes: {
          athleteId: athlete.id,
          type: values.kind,
          signedBy: parentId ? "parent" : "athlete",
        },
      },
    })

    revalidateAthlete(athlete.id)
    return { ok: true, data: { id: consent.id } }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function softDeleteConsent(
  consentId: string,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(consentId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo consenso non valido" }
  }

  try {
    const existing = await prisma.consent.findUnique({
      where: { id: idParsed.data },
      select: { id: true, athleteId: true, deletedAt: true },
    })
    if (!existing || !existing.athleteId) {
      return { ok: false, error: "Consenso non trovato" }
    }
    if (existing.deletedAt) return { ok: true } // idempotente

    await prisma.consent.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "SOFT_DELETE",
        entityType: "Consent",
        entityId: existing.id,
      },
    })

    revalidateAthlete(existing.athleteId)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function restoreConsent(consentId: string): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(consentId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo consenso non valido" }
  }

  try {
    const existing = await prisma.consent.findUnique({
      where: { id: idParsed.data },
      select: { id: true, athleteId: true, deletedAt: true },
    })
    if (!existing || !existing.athleteId) {
      return { ok: false, error: "Consenso non trovato" }
    }
    if (!existing.deletedAt) return { ok: true } // idempotente

    await prisma.consent.update({
      where: { id: existing.id },
      data: { deletedAt: null },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "RESTORE",
        entityType: "Consent",
        entityId: existing.id,
      },
    })

    revalidateAthlete(existing.athleteId)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}
