import { NextResponse, type NextRequest } from "next/server"

import { prisma } from "@/lib/prisma"
import { getDashboardPath } from "@/lib/auth/dashboard-path"
import { updateSession } from "@/lib/supabase/middleware"

const PUBLIC_PATHS = ["/", "/login"]

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
  // Fallback: lascia su /login se User Prisma mancante o disattivo
  // (login server action o requireXxx helper gestisce signOut).
  if (user && pathname === "/login") {
    const prismaUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, isActive: true },
    })

    if (prismaUser && prismaUser.isActive) {
      const url = request.nextUrl.clone()
      url.pathname = getDashboardPath(prismaUser.role)
      return NextResponse.redirect(url)
    }
    // Auth user orfano: rimane su /login
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
