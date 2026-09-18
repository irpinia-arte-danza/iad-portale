"use server"

import { revalidatePath } from "next/cache"

import { requireAdmin } from "@/lib/auth/require-admin"
import { sendAccessInviteCore } from "@/lib/auth/access-emails"
import type { AccessInviteResult } from "@/lib/auth/access-status-types"
import { uuidSchema } from "@/lib/schemas/common"

const ATHLETES_PATH = "/admin/athletes"

// "Invia accesso" / "Reinvia accesso" dalla scheda allieva: stesso gesto dei
// genitori e degli insegnanti, stesso motore (sendAccessInviteCore).
// Ripetibile: ogni invio genera un link nuovo e invalida il precedente.
//
// Vale solo per le allieve maggiorenni senza genitori collegati: il controllo
// sta nel motore, così non si può aggirare passando da un'altra strada.
export async function sendAthleteAccessInvite(
  athleteId: string,
  options?: { skipRevalidate?: boolean },
): Promise<AccessInviteResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(athleteId)
  if (!idParsed.success) {
    return { ok: false, code: "NOT_FOUND", error: "Identificativo non valido" }
  }

  const result = await sendAccessInviteCore({
    kind: "ATHLETE",
    profileId: idParsed.data,
    adminUserId: userId,
  })

  if (!options?.skipRevalidate) {
    revalidatePath(ATHLETES_PATH)
    revalidatePath(`${ATHLETES_PATH}/${idParsed.data}`)
  }
  return result
}
