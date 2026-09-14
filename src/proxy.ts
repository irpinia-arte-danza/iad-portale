import { NextResponse, type NextRequest } from "next/server"

import { resolveAccountState } from "@/lib/auth/account-state"
import { getDashboardPath } from "@/lib/auth/dashboard-path"
import { updateSession } from "@/lib/supabase/middleware"

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/password-dimenticata",
  "/accesso-non-attivo",
]

// Path interni gestiti senza session (es. callback OAuth crea la session)
const PUBLIC_PREFIXES = ["/auth/"]

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
}

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

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/* (all Next.js internals: static, image, chunks, etc.)
     * - api/* (future API routes)
     * - Root files: favicon.ico, robots.txt, sitemap.xml
     * - Any path containing a dot (file with extension, not a route)
     */
    "/((?!_next|api|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\..*).*)",
  ],
}
