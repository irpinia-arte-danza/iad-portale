import { NextResponse, type NextRequest } from "next/server"

import type { EmailOtpType } from "@supabase/supabase-js"

import { NO_ACCESS_PAGE, resolveAccountState } from "@/lib/auth/account-state"
import { getDashboardPath, getRoleAreaPrefix } from "@/lib/auth/dashboard-path"
import { safeNextPath } from "@/lib/auth/safe-next"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

const VALID_TYPES: EmailOtpType[] = [
  "invite",
  "recovery",
  "signup",
  "email_change",
  "magiclink",
  "email",
]

// Link scaduto / già usato / manomesso: pagina comprensibile con richiesta
// di un nuovo link, non un errore tecnico.
const LINK_INVALID_PATH = "/password-dimenticata?motivo=link-non-valido"

// Destinazione dei link personali generati in src/lib/auth/access-emails.ts:
//   /auth/confirm?token_hash=…&type=invite|recovery[&intent=access]
//
// 1. verifyOtp(token_hash, type) → sessione cookie SSR
// 2. L'account deve essere utilizzabile (utente Prisma attivo + profilo non
//    nel cestino). Non si creano utenti qui: li crea solo l'invito admin.
// 3. invite / recovery → /imposta-password (unica pagina per tutti i ruoli)
//    altri tipi → next validato o dashboard del ruolo
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const tokenHash = searchParams.get("token_hash")
  const typeRaw = searchParams.get("type")
  const intent = searchParams.get("intent")
  const nextParam = searchParams.get("next")

  if (
    !tokenHash ||
    !typeRaw ||
    !VALID_TYPES.includes(typeRaw as EmailOtpType)
  ) {
    return NextResponse.redirect(`${origin}${LINK_INVALID_PATH}`)
  }
  const type = typeRaw as EmailOtpType

  const supabase = await createClient()
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  })

  if (error || !data.session || !data.user) {
    console.error("[auth/confirm] verifyOtp failed", {
      type,
      code: error?.code,
    })
    return NextResponse.redirect(`${origin}${LINK_INVALID_PATH}`)
  }

  const account = await resolveAccountState(data.user.id)
  if (account.state === "blocked") {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}${NO_ACCESS_PAGE}`)
  }

  if (type === "invite" || type === "recovery") {
    const tipo = type === "invite" || intent === "access" ? "benvenuto" : "recupero"
    return NextResponse.redirect(`${origin}/imposta-password?tipo=${tipo}`)
  }

  const target = safeNextPath(nextParam, getDashboardPath(account.role), [
    getRoleAreaPrefix(account.role),
  ])
  return NextResponse.redirect(`${origin}${target}`)
}
