import { NextResponse, type NextRequest } from "next/server"

import { NO_ACCESS_PAGE, resolveAccountState } from "@/lib/auth/account-state"
import {
  confirmPageHtml,
  isConfirmType,
  type ConfirmType,
} from "@/lib/auth/confirm-page"
import { getDashboardPath, getRoleAreaPrefix } from "@/lib/auth/dashboard-path"
import { safeNextPath } from "@/lib/auth/safe-next"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Link scaduto / già usato / manomesso: pagina comprensibile con richiesta
// di un nuovo link, non un errore tecnico.
const LINK_INVALID_PATH = "/password-dimenticata?motivo=link-non-valido"

// Destinazione dei link personali generati in src/lib/auth/access-emails.ts:
//   /auth/confirm?token_hash=…&type=invite|recovery[&intent=access]
//
// GET  → pagina con il tasto («Attiva il mio accesso» / «Imposta la nuova
//        password»). Non tocca il token: gli scanner della posta e le
//        anteprime dei link aprono la GET, e il link resta valido.
// POST → verifyOtp(token_hash, type) → sessione cookie SSR. L'account deve
//        essere utilizzabile (utente Prisma attivo + profilo non nel
//        cestino). Non si creano utenti qui: li crea solo l'invito admin.
//        invite / recovery → /imposta-password (unica pagina per tutti i
//        ruoli); next validato solo come ripiego.
function readParams(source: URLSearchParams | FormData) {
  const get = (key: string) => {
    const value = source.get(key)
    return typeof value === "string" && value.length > 0 ? value : null
  }
  return {
    tokenHash: get("token_hash"),
    type: get("type"),
    intent: get("intent"),
    next: get("next"),
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const params = readParams(searchParams)

  if (!params.tokenHash || !isConfirmType(params.type)) {
    return NextResponse.redirect(`${origin}${LINK_INVALID_PATH}`)
  }

  const brand = await prisma.brandSettings.findUnique({
    where: { id: 1 },
    select: { asdName: true },
  })

  const html = confirmPageHtml({
    tokenHash: params.tokenHash,
    type: params.type,
    intent: params.intent,
    next: params.next,
    asdName: brand?.asdName ?? "A.S.D. IAD Irpinia Arte Danza",
  })

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}

export async function POST(request: NextRequest) {
  const { origin } = request.nextUrl
  const params = readParams(await request.formData())

  if (!params.tokenHash || !isConfirmType(params.type)) {
    return NextResponse.redirect(`${origin}${LINK_INVALID_PATH}`, 303)
  }
  const type: ConfirmType = params.type

  const supabase = await createClient()
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: params.tokenHash,
    type,
  })

  if (error || !data.session || !data.user) {
    console.error("[auth/confirm] verifyOtp failed", {
      type,
      code: error?.code,
    })
    return NextResponse.redirect(`${origin}${LINK_INVALID_PATH}`, 303)
  }

  const account = await resolveAccountState(data.user.id)
  if (account.state === "blocked") {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}${NO_ACCESS_PAGE}`, 303)
  }

  if (type === "invite" || type === "recovery") {
    const tipo =
      type === "invite" || params.intent === "access" ? "benvenuto" : "recupero"
    return NextResponse.redirect(`${origin}/imposta-password?tipo=${tipo}`, 303)
  }

  const target = safeNextPath(params.next, getDashboardPath(account.role), [
    getRoleAreaPrefix(account.role),
  ])
  return NextResponse.redirect(`${origin}${target}`, 303)
}
