import { NextResponse, type NextRequest } from "next/server"

import { UserRole } from "@prisma/client"

import { NO_ACCESS_ROUTE, resolveAccountState } from "@/lib/auth/account-state"
import { messagePage } from "@/lib/receipts/message-page"
import { ReceiptRenderError } from "@/lib/receipts/receipt-document"
import {
  renderReceiptPreviewPdf,
  type ReceiptPreviewResult,
} from "@/lib/receipts/receipt-preview"
import { uuidSchema } from "@/lib/schemas/common"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteParams = {
  params: Promise<{ paymentId: string }>
}

const BACK_HREF = "/admin/payments"

const PREVIEW_MESSAGES: Record<
  Extract<ReceiptPreviewResult, { ok: false }>["reason"],
  { status: number; title: string; message: string }
> = {
  NOT_FOUND: {
    status: 404,
    title: "Pagamento non trovato",
    message: "Il pagamento non esiste o è stato eliminato.",
  },
  ALREADY_ISSUED: {
    status: 409,
    title: "Ricevuta già emessa",
    message:
      "Per questo pagamento la ricevuta è già stata emessa: aprila dall'elenco ricevute.",
  },
  REVERSED: {
    status: 409,
    title: "Pagamento stornato",
    message: "Il pagamento è stornato: non si può emettere la ricevuta.",
  },
  NO_SETTINGS: {
    status: 500,
    title: "Numerazione non configurata",
    message: "Controlla la numerazione in Impostazioni → Ricevute.",
  },
}

// Anteprima PDF della ricevuta che verrebbe emessa per un pagamento, prima che
// il numero venga assegnato. Solo admin. Nessuna scrittura: niente numero,
// niente archivio; filigrana "ANTEPRIMA" su ogni pagina. Il percorso non è
// pubblico: il proxy manda al login chi non è autenticato.
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { origin } = request.nextUrl

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/login`)

  const account = await resolveAccountState(user.id)
  if (account.state === "blocked") {
    return NextResponse.redirect(`${origin}${NO_ACCESS_ROUTE}`)
  }
  if (account.role !== UserRole.ADMIN) {
    console.warn("[receipt preview] access denied: role not allowed", {
      userId: account.userId,
      role: account.role,
    })
    return messagePage({
      status: 403,
      title: "Accesso non consentito",
      message: "L'anteprima delle ricevute è riservata alla segreteria.",
      backHref: "/",
    })
  }

  const { paymentId } = await params
  const idParsed = uuidSchema.safeParse(paymentId)
  if (!idParsed.success) {
    return messagePage({ ...PREVIEW_MESSAGES.NOT_FOUND, backHref: BACK_HREF })
  }
  const logContext = { paymentId: idParsed.data, userId: account.userId }

  try {
    const result = await renderReceiptPreviewPdf(idParsed.data)
    if (!result.ok) {
      console.info("[receipt preview] not available", {
        ...logContext,
        reason: result.reason,
      })
      return messagePage({
        ...PREVIEW_MESSAGES[result.reason],
        backHref: BACK_HREF,
      })
    }

    const body = new Uint8Array(result.pdf)
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="Anteprima ricevuta.pdf"',
        "Content-Length": String(body.byteLength),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    const code = error instanceof ReceiptRenderError ? error.code : "RENDER_FAILED"
    console.error("[receipt preview] render failed", { ...logContext, code }, error)
    return messagePage({
      status: 500,
      title: "Anteprima non generata",
      message:
        code === "NO_BRAND"
          ? "Mancano i dati dell'associazione in Impostazioni → Associazione: senza, il PDF non può essere generato."
          : "L'anteprima non si è potuta generare per un errore tecnico, già registrato. Segnalalo all'assistenza prima di emettere la ricevuta.",
      backHref: BACK_HREF,
    })
  }
}
