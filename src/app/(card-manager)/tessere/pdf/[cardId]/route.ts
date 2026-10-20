import { NextResponse, type NextRequest } from "next/server"

import { AuditAction } from "@prisma/client"

import { getCardManagerCardFile } from "@/lib/cards/manager-queries"
import { logError } from "@/lib/logging/log-error"
import { prisma } from "@/lib/prisma"
import { messagePage } from "@/lib/receipts/message-page"
import { uuidSchema } from "@/lib/schemas/common"
import { getAffiliationCardSignedUrl } from "@/lib/supabase/storage-affiliation-card"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteParams = {
  params: Promise<{ cardId: string }>
}

// ─────────────────────────────────────────────────────────────────────────
// «Apri PDF» del referente tessere, in «Tesserate quest'anno».
//
// Un link vero (<a target="_blank">) e non window.open dopo una server
// action: Safari su iPad blocca le finestre aperte dopo un'attesa, e con un
// link apre la sua anteprima del PDF. Qui, al clic: il referente
// (requireCardManager), la tessera solo se sta nella sua lista
// (cardManagerCardsWhere: ENDAS, stagione corrente, allieva attiva, con PDF;
// un id fuori lista è 404), la riga di audit, il link firmato da cinque
// minuti generato adesso, e il redirect. Il link non si salva.
// ─────────────────────────────────────────────────────────────────────────

function notFound(): NextResponse {
  return messagePage({
    status: 404,
    title: "Tessera non trovata",
    message: "Questa tessera non è fra quelle che puoi aprire, oppure non ha un PDF.",
    backHref: "/tessere",
  })
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { cardId } = await params
  const idParsed = uuidSchema.safeParse(cardId)
  if (!idParsed.success) return notFound()

  // Fuori sessione o con un altro ruolo requireCardManager fa redirect
  const card = await getCardManagerCardFile(idParsed.data)
  if (!card) return notFound()

  const signedUrl = await getAffiliationCardSignedUrl(card.filePath)
  if (!signedUrl) {
    return messagePage({
      status: 502,
      title: "PDF non disponibile",
      message: "Non è stato possibile aprire il PDF adesso. Riprova fra qualche minuto.",
      backHref: "/tessere",
    })
  }

  // Ogni apertura resta scritta: chi (il referente) e quale tessera. Non
  // c'è un'azione CARD_VIEW nell'enum e aggiungerla vorrebbe una migration:
  // EXPORT, con il dettaglio in changes.
  try {
    await prisma.auditLog.create({
      data: {
        userId: card.userId,
        action: AuditAction.EXPORT,
        entityType: "Affiliation",
        entityId: idParsed.data,
        changes: { change: "CARD_PDF_OPEN", by: "CARD_MANAGER" },
      },
    })
  } catch (error) {
    // Senza audit il PDF non si apre: l'apertura deve restare tracciata
    logError("[tessere/pdf] audit failed", error)
    return messagePage({
      status: 500,
      title: "PDF non disponibile",
      message: "Non è stato possibile aprire il PDF adesso. Riprova fra qualche minuto.",
      backHref: "/tessere",
    })
  }

  const response = NextResponse.redirect(signedUrl, 303)
  response.headers.set("Cache-Control", "private, no-store")
  return response
}
