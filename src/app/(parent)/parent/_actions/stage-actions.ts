"use server"

import { revalidatePath } from "next/cache"

import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { requireParent } from "@/lib/auth/require-parent"
import type { ActionResult } from "@/lib/schemas/common"
import { uuidSchema } from "@/lib/schemas/common"

import { enrollAthleteCore } from "@/app/(admin)/admin/stages/actions"

const parentEnrollSchema = z.object({
  stageId: uuidSchema,
  athleteIds: z
    .array(uuidSchema)
    .min(1, "Seleziona almeno una figlia")
    .max(10, "Massimo 10 figlie per volta"),
})

export type ParentEnrollResult = {
  enrolled: number
  failed: { athleteId: string; reason: string }[]
}

export async function parentEnrollAthletesInStage(
  input: z.infer<typeof parentEnrollSchema>,
): Promise<ActionResult<ParentEnrollResult>> {
  const { parentId, userId } = await requireParent()

  const parsed = parentEnrollSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  // Verifica che tutte le athleteIds appartengano al genitore
  const ownedAthletes = await prisma.athleteParent.findMany({
    where: {
      parentId,
      athleteId: { in: parsed.data.athleteIds },
      athlete: { deletedAt: null },
    },
    select: { athleteId: true },
  })
  const ownedSet = new Set(ownedAthletes.map((r) => r.athleteId))
  const unauthorized = parsed.data.athleteIds.filter((id) => !ownedSet.has(id))
  if (unauthorized.length > 0) {
    return { ok: false, error: "Una o più figlie non sono collegate al tuo profilo" }
  }

  let enrolled = 0
  const failed: { athleteId: string; reason: string }[] = []

  for (const athleteId of parsed.data.athleteIds) {
    const result = await enrollAthleteCore({
      stageId: parsed.data.stageId,
      athleteId,
      notes: "Iscrizione genitore",
      enrolledByUserId: userId,
      auditUserId: userId,
    })
    if (result.ok) enrolled += 1
    else failed.push({ athleteId, reason: result.error })
  }

  revalidatePath("/parent/dashboard")
  revalidatePath("/parent/stages")
  revalidatePath("/parent/payments")
  return { ok: true, data: { enrolled, failed } }
}
