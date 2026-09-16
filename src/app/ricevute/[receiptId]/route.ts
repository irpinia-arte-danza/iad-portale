import { NextResponse, type NextRequest } from "next/server"

import { ReceiptStatus, UserRole } from "@prisma/client"

import { NO_ACCESS_ROUTE, resolveAccountState } from "@/lib/auth/account-state"
import { prisma } from "@/lib/prisma"
import { stampCancelledReceipt } from "@/lib/receipts/cancelled-stamp"
import {
  loadReceiptForPdf,
  ReceiptRenderError,
  receiptPdfFileName,
} from "@/lib/receipts/receipt-document"
import { messagePage } from "@/lib/receipts/message-page"
import {
  ReceiptArchiveError,
  readReceiptPdf,
} from "@/lib/receipts/receipt-pdf-store"
import { uuidSchema } from "@/lib/schemas/common"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type RouteParams = {
  params: Promise<{ receiptId: string }>
}

function backHrefFor(role: UserRole): string {
  if (role === UserRole.ADMIN) return "/admin/receipts"
  if (role === UserRole.PARENT) return "/parent/dashboard"
  return "/"
}

// Messaggio per un PDF che non si può consegnare, in base alla causa
function pdfFailureMessage(code: string, isAdmin: boolean): {
  status: number
  title: string
  message: string
} {
  if (code === "STORAGE_UNAVAILABLE") {
    return {
      status: 503,
      title: "Archivio non raggiungibile",
      message:
        "L'archivio delle ricevute non risponde in questo momento. Riprova tra qualche minuto.",
    }
  }
  if (code === "STORED_FILE_MISSING") {
    return {
      status: 500,
      title: "PDF non disponibile",
      message: isAdmin
        ? "Il PDF archiviato di questa ricevuta non si trova. Non viene rigenerato per non consegnare un documento diverso dall'originale: segnalalo all'assistenza indicando il numero di ricevuta."
        : "Il PDF di questa ricevuta non è disponibile al momento. Contatta la segreteria.",
    }
  }
  const message =
    code === "NO_BRAND" && isAdmin
      ? "Mancano i dati dell'associazione in Impostazioni → Associazione: senza, il PDF non può essere generato."
      : code === "NO_PAYMENT" && isAdmin
        ? "La ricevuta non risulta collegata a un pagamento: il PDF non può essere generato. Segnalalo all'assistenza."
        : isAdmin
          ? "La ricevuta esiste ma il PDF non si è potuto generare per un errore tecnico, già registrato. Segnalalo all'assistenza indicando il numero di ricevuta."
          : "La ricevuta esiste ma il PDF non si è potuto generare per un errore tecnico. Contatta la segreteria."
  return { status: 500, title: "PDF non generato", message }
}

// PDF di una ricevuta già emessa, servito inline: si apre nel visualizzatore
// del telefono (anche dentro Gmail/WhatsApp) e si stampa dal browser.
// - admin: qualsiasi ricevuta; se annullata, sopra il file originale si
//   aggiunge al volo la filigrana "ANNULLATA" (il file archiviato non cambia)
// - genitore: solo ricevute valide di allieve collegate al proprio profilo
// - altri ruoli: accesso negato
// Si serve sempre il file archiviato all'emissione. Se non c'è ancora (archivio
// non riuscito all'emissione) si genera, si archivia e si serve.
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
  const isAdmin = account.role === UserRole.ADMIN
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
  } else if (!isAdmin) {
    console.warn("[receipt pdf] access denied: role not allowed", logContext)
    return messagePage({
      status: 403,
      title: "Accesso non consentito",
      message: "Il tuo account non può consultare le ricevute.",
      backHref,
    })
  }

  // 3) File archiviato (o generato e archiviato ora)
  let pdf: Uint8Array
  try {
    const result = await readReceiptPdf(receipt)
    pdf = result.pdf
    if (result.source !== "archive") {
      console.info("[receipt pdf] served without prior archive", {
        ...logContext,
        source: result.source,
      })
    }
  } catch (error) {
    const code =
      error instanceof ReceiptArchiveError || error instanceof ReceiptRenderError
        ? error.code
        : "RENDER_FAILED"
    console.error("[receipt pdf] delivery failed", { ...logContext, code }, error)
    return messagePage({ ...pdfFailureMessage(code, isAdmin), backHref })
  }

  // 4) Ricevuta annullata (qui arriva solo l'admin): filigrana sopra l'originale.
  //    Se non si riesce a segnarla, non si consegna una copia che sembra valida.
  if (receipt.status === ReceiptStatus.CANCELLED) {
    try {
      pdf = await stampCancelledReceipt(pdf, {
        cancelledAt: receipt.cancelledAt ?? receipt.issueDate,
        reason: receipt.cancelReason,
      })
    } catch (error) {
      console.error("[receipt pdf] cancelled stamp failed", logContext, error)
      return messagePage({
        status: 500,
        title: "PDF non generato",
        message:
          "La ricevuta è annullata ma non è stato possibile segnarla come tale sul PDF, quindi non viene mostrata. Segnalalo all'assistenza indicando il numero di ricevuta.",
        backHref,
      })
    }
  }

  const { ascii, utf8 } = receiptPdfFileName(receipt)
  const body = new Uint8Array(pdf)

  // ?download=1 salva il file invece di aprirlo nel visualizzatore. Stessa
  // route e stessi controlli: su iPad guardare prima di scaricare resta il
  // comportamento predefinito.
  const disposition =
    request.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline"

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(utf8)}`,
      "Content-Length": String(body.byteLength),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
