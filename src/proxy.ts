import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

const PUBLIC_PATHS = ["/", "/login"]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname)
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

  // Step 3: se utente AUTH visita /login → redirect a dashboard
  // (UX: non vedere login quando sei già dentro)
  // Per ora hardcoded a /admin/dashboard, ma 3C.5b lo renderà
  // role-based
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/admin/dashboard"
    return NextResponse.redirect(url)
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
