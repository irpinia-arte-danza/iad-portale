import { NextResponse, type NextRequest } from "next/server"

import { NO_ACCESS_PAGE, resolveAccountState } from "@/lib/auth/account-state"
import { getDashboardPath } from "@/lib/auth/dashboard-path"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Punto d'uscita per utenti autenticati senza accesso utilizzabile (profilo
// nel cestino, utente disattivato, account senza profilo): logout e pagina
// esplicativa. Sostituisce il vecchio redirect("/login") che, con il proxy
// che rimanda gli autenticati alla dashboard, generava un loop infinito.
//
// Se l'account è invece valido non si fa logout (evita che un link esterno
// a questa URL disconnetta un utente regolare).
export async function GET(request: NextRequest) {
  const { origin } = request.nextUrl
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const account = await resolveAccountState(user.id)
    if (account.state === "ok") {
      return NextResponse.redirect(`${origin}${getDashboardPath(account.role)}`)
    }
    await supabase.auth.signOut()
  }

  return NextResponse.redirect(`${origin}${NO_ACCESS_PAGE}`)
}
