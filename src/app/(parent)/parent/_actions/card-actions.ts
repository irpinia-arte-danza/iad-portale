"use server"

import { prisma } from "@/lib/prisma"
import { athleteScopeWhere } from "@/lib/auth/portal-scope"
import { requirePortalAccess } from "@/lib/auth/require-portal-access"
import type { ActionResult } from "@/lib/schemas/common"
import { uuidSchema } from "@/lib/schemas/common"
import { getAffiliationCardSignedUrl } from "@/lib/supabase/storage-affiliation-card"

// Link al PDF della tessera per la famiglia. L'ambito si riapplica qui: si
// scarica solo la tessera di un'allieva che l'account può vedere, e l'id della
// tessera da solo non basta ad aprirla.
export async function getPortalCardUrl(
  cardId: string,
): Promise<ActionResult<{ signedUrl: string }>> {
  const { scope } = await requirePortalAccess()

  const idParsed = uuidSchema.safeParse(cardId)
  if (!idParsed.success) return { ok: false, error: "Tessera non trovata" }

  const card = await prisma.affiliation.findFirst({
    where: {
      id: idParsed.data,
      deletedAt: null,
      athlete: { deletedAt: null, ...athleteScopeWhere(scope) },
    },
    select: { filePath: true },
  })
  if (!card) return { ok: false, error: "Tessera non trovata" }
  if (!card.filePath) return { ok: false, error: "Nessun PDF disponibile" }

  const url = await getAffiliationCardSignedUrl(card.filePath)
  if (!url) return { ok: false, error: "Link non disponibile, riprova" }

  return { ok: true, data: { signedUrl: url } }
}
