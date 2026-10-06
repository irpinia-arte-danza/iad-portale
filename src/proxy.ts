import { NextResponse, type NextRequest } from "next/server"

import { NO_ACCESS_ROUTE, resolveAccountState } from "@/lib/auth/account-state"
import { getDashboardPath } from "@/lib/auth/dashboard-path"
// Aree per ruolo e matcher: in src/lib/auth/proxy-matcher.ts, con i test
import { areaOf, wrongAreaRedirect } from "@/lib/auth/proxy-matcher"
// Le pagine pubbliche (login, privacy, …) stanno in un modulo a parte, con
// il loro test
import { isPublicPath } from "@/lib/auth/public-paths"
import { updateSession } from "@/lib/supabase/middleware"

export async function proxy(request: NextRequest) {
  // Step 1: refresh session (critico — cookies Supabase hanno TTL
  // breve e devono essere refreshati sulle request)
  const { supabaseResponse, user } = await updateSession(request)

  const pathname = request.nextUrl.pathname

  // Step 2: se utente NON autenticato prova route non-public →
  // redirect a /login
  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // Step 3: se utente AUTH visita /login → redirect dashboard role-based.
  // Costo: 1 query Prisma SOLO sulla rotta /login, non per ogni request.
  // Solo account utilizzabili (utente attivo + profilo non nel cestino):
  // gli altri restano su /login, dove la login action spiega il motivo.
  // Redirigerli alla dashboard riaprirebbe il loop login ↔ dashboard.
  if (user && pathname === "/login") {
    const account = await resolveAccountState(user.id)

    if (account.state === "ok") {
      const url = request.nextUrl.clone()
      url.pathname = getDashboardPath(account.role)
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // Step 4: dentro /admin, /teacher, /parent il ruolo deve essere quello
  // dell'area. Le pagine e le query lo controllano comunque (requireAdmin &
  // co.), ma così un genitore che chiede /admin viene rimandato alla sua
  // dashboard prima che una pagina parta. Una query Prisma per richiesta
  // nelle aree riservate, la stessa che fanno già layout e pagine.
  if (user && areaOf(pathname)) {
    const account = await resolveAccountState(user.id)
    const url = request.nextUrl.clone()
    if (account.state === "blocked") {
      url.pathname = NO_ACCESS_ROUTE
      url.search = ""
      return NextResponse.redirect(url)
    }
    const target = wrongAreaRedirect(pathname, account.role)
    if (target) {
      url.pathname = target
      url.search = ""
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Tutte le richieste tranne:
     * - _next/* (interni di Next: static, image, chunks…)
     * - api/* (cron e webhook hanno la loro autorizzazione)
     * - i file statici con le estensioni note (favicon, robots, immagini,
     *   font…). Non «qualsiasi percorso con un punto»: /admin/stages/abc.
     *   deve passare dal proxy. Copia identica in
     *   src/lib/auth/proxy-matcher.ts (PROXY_MATCHER), con il test.
     */
    "/((?!_next|api|.*\\.(?:ico|png|svg|jpg|jpeg|webp|css|js|txt|xml|woff2)$).*)",
  ],
}
