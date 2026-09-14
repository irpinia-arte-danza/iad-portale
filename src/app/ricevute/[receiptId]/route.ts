import { NextResponse, type NextRequest } from "next/server"

import { ReceiptStatus, UserRole } from "@prisma/client"

import { NO_ACCESS_ROUTE, resolveAccountState } from "@/lib/auth/account-state"
import { prisma } from "@/lib/prisma"
import {
  loadReceiptForPdf,
  ReceiptRenderError,
  receiptPdfFileName,
  renderReceiptPdf,
} from "@/lib/receipts/receipt-document"
import { uuidSchema } from "@/lib/schemas/common"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteParams = {
  params: Promise<{ receiptId: string }>
}

// Pagina di messaggio minimale: il link si apre spesso da telefono o dentro
// Gmail/WhatsApp, un testo semplice lì è illeggibile. Testi statici, nessun
// dato dell'utente interpolato.
function messagePage(params: {
  status: number
  title: string
  message: string
  backHref: string
}): NextResponse {
  const html = `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${params.title}</title>
<style>
body{margin:0;padding:16px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#fafafa;color:#171717}
main{max-width:420px;margin:12vh auto 0;background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:24px}
h1{font-size:18px;margin:0 0 8px}
p{font-size:15px;line-height:1.5;margin:0 0 16px;color:#404040}
a{display:inline-block;min-height:44px;box-sizing:border-box;padding:12px 16px;border-radius:8px;background:#171717;color:#fff;text-decoration:none;font-size:15px}
</style>
</head>
<body>
<main>
<h1>${params.title}</h1>
<p>${params.message}</p>
<a href="${params.backHref}">Torna indietro</a>
</main>
</body>
</html>`

  return new NextResponse(html, {
    status: params.status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}

function backHrefFor(role: UserRole): string {
  if (role === UserRole.ADMIN) return "/admin/receipts"
  if (role === UserRole.PARENT) return "/parent/dashboard"
  return "/"
}

// PDF di una ricevuta già emessa, servito inline: si apre nel visualizzatore
// del telefono (anche dentro Gmail/WhatsApp) e si stampa dal browser.
// - admin: qualsiasi ricevuta, anche annullata (il PDF lo dichiara)
// - genitore: solo ricevute valide di allieve collegate al proprio profilo
// - altri ruoli: accesso negato
// Il percorso non è pubblico: il proxy manda al login chi non è autenticato.
// Ogni esito diverso dal PDF viene loggato lato server con la sua causa.
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

  const backHref = backHrefFor(account.role)
  const { receiptId } = await params
  const logContext = { receiptId, userId: account.userId, role: account.role }

  // 1) Ricevuta inesistente
  const idParsed = uuidSchema.safeParse(receiptId)
  if (!idParsed.success) {
    console.warn("[receipt pdf] invalid receipt id", logContext)
    return messagePage({
      status: 404,
      title: "Ricevuta non trovata",
      message: "Il link della ricevuta non è valido. Aprila di nuovo dall'elenco.",
      backHref,
    })
  }

  const receipt = await loadReceiptForPdf(idParsed.data)
  if (!receipt) {
    console.warn("[receipt pdf] receipt not found", logContext)
    return messagePage({
      status: 404,
      title: "Ricevuta non trovata",
      message:
        "Questa ricevuta non esiste. Controlla il link oppure contatta la segreteria.",
      backHref,
    })
  }

  // 2) Non autorizzato
  if (account.role === UserRole.PARENT) {
    const owned =
      account.parentId && receipt.payment
        ? await prisma.athleteParent.count({
            where: {
              parentId: account.parentId,
              athleteId: receipt.payment.athleteId,
            },
          })
        : 0
    if (owned === 0) {
      console.warn("[receipt pdf] access denied: receipt not linked to parent", logContext)
      return messagePage({
        status: 403,
        title: "Accesso non consentito",
        message:
          "Questa ricevuta non riguarda le allieve collegate al tuo account.",
        backHref,
      })
    }
    if (receipt.status !== ReceiptStatus.VALID) {
      console.info("[receipt pdf] cancelled receipt requested by parent", logContext)
      return messagePage({
        status: 410,
        title: "Ricevuta annullata",
        message:
          "Questa ricevuta è stata annullata dalla segreteria e non è più valida. Per chiarimenti contatta la segreteria.",
        backHref,
      })
    }
  } else if (account.role !== UserRole.ADMIN) {
    console.warn("[receipt pdf] access denied: role not allowed", logContext)
    return messagePage({
      status: 403,
      title: "Accesso non consentito",
      message: "Il tuo account non può consultare le ricevute.",
      backHref,
    })
  }

  // 3) Errore di generazione (non transitorio: va segnalato, non ritentato)
  let pdf: Buffer
  try {
    pdf = await renderReceiptPdf(receipt)
  } catch (error) {
    const code = error instanceof ReceiptRenderError ? error.code : "RENDER_FAILED"
    console.error("[receipt pdf] generation failed", { ...logContext, code }, error)

    const isAdmin = account.role === UserRole.ADMIN
    const message =
      code === "NO_BRAND" && isAdmin
        ? "Mancano i dati dell'associazione in Impostazioni → Associazione: senza, il PDF non può essere generato."
        : code === "NO_PAYMENT" && isAdmin
          ? "La ricevuta non risulta collegata a un pagamento: il PDF non può essere generato. Segnalalo all'assistenza."
          : isAdmin
            ? "La ricevuta esiste ma il PDF non si è potuto generare per un errore tecnico, già registrato. Segnalalo all'assistenza indicando il numero di ricevuta."
            : "La ricevuta esiste ma il PDF non si è potuto generare per un errore tecnico. Contatta la segreteria."

    return messagePage({
      status: 500,
      title: "PDF non generato",
      message,
      backHref,
    })
  }

  const { ascii, utf8 } = receiptPdfFileName(receipt)
  const body = new Uint8Array(pdf)

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(utf8)}`,
      "Content-Length": String(body.byteLength),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
