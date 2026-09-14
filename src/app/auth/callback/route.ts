import { NextResponse, type NextRequest } from "next/server"

import { NO_ACCESS_PAGE, resolveAccountState } from "@/lib/auth/account-state"
import { getDashboardPath, getRoleAreaPrefix } from "@/lib/auth/dashboard-path"
import { safeNextPath } from "@/lib/auth/safe-next"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

// Callback OAuth / PKCE Supabase. Il pulsante "Accedi con Google" è stato
// rimosso (nessun utente lo usava) ma la route resta come difesa: se il
// provider venisse riattivato in dashboard, qui NON si creano mai utenti.
// Entra solo chi corrisponde a un account già esistente e utilizzabile
// (admin, genitore o insegnante con profilo attivo).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const next = searchParams.get("next")
  const errorDescription = searchParams.get("error_description")

  if (errorDescription) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session || !data.user) {
    console.error("[auth/callback] exchange failed", { code: error?.code })
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
  }

  const account = await resolveAccountState(data.user.id)
  if (account.state === "blocked") {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}${NO_ACCESS_PAGE}`)
  }

  const target = safeNextPath(next, getDashboardPath(account.role), [
    getRoleAreaPrefix(account.role),
  ])
  return NextResponse.redirect(`${origin}${target}`)
}
