"use server"

import { revalidatePath } from "next/cache"

import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { personalDataScopeWhere } from "@/lib/auth/portal-visibility"
import { requirePortalAccess } from "@/lib/auth/require-portal-access"
import type { ActionResult } from "@/lib/schemas/common"
import { uuidSchema } from "@/lib/schemas/common"
import { enrollAthleteCore } from "@/lib/stages/enroll-athlete"

const parentEnrollSchema = z.object({
  stageId: uuidSchema,
  athleteIds: z
    .array(uuidSchema)
    .min(1, "Seleziona almeno un'allieva")
    .max(10, "Massimo 10 allieve per volta"),
})

export type ParentEnrollResult = {
  enrolled: number
  failed: { athleteId: string; reason: string }[]
}

export async function parentEnrollAthletesInStage(
  input: z.infer<typeof parentEnrollSchema>,
): Promise<ActionResult<ParentEnrollResult>> {
  const { scope, userId } = await requirePortalAccess()

  const parsed = parentEnrollSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  // Si possono iscrivere solo le allieve di cui si decidono le cose
  // personali: le figlie minorenni per un genitore, sé stessa per
  // un'allieva maggiorenne. Una maggiorenne la iscrive solo lei.
  const ownedAthletes = await prisma.athlete.findMany({
    where: {
      deletedAt: null,
      id: { in: parsed.data.athleteIds },
      ...personalDataScopeWhere(scope),
    },
    select: { id: true },
  })
  const ownedSet = new Set(ownedAthletes.map((a) => a.id))
  const unauthorized = parsed.data.athleteIds.filter((id) => !ownedSet.has(id))
  if (unauthorized.length > 0) {
    return {
      ok: false,
      error:
        scope.kind === "athlete"
          ? "Puoi iscrivere solo te stessa"
          : "Puoi iscrivere solo le figlie minorenni collegate al tuo profilo: una maggiorenne si iscrive dalla sua area",
    }
  }

  let enrolled = 0
  const failed: { athleteId: string; reason: string }[] = []

  for (const athleteId of parsed.data.athleteIds) {
    const result = await enrollAthleteCore({
      stageId: parsed.data.stageId,
      athleteId,
      notes:
        scope.kind === "athlete"
          ? "Iscrizione dall'area riservata"
          : "Iscrizione genitore",
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
