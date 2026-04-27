import { NextResponse, type NextRequest } from "next/server"

import { prisma } from "@/lib/prisma"
import { getDashboardPath } from "@/lib/auth/dashboard-path"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

// Standard Supabase OAuth callback:
// 1. exchange `code` query param per session (cookie set via SSR client)
// 2. assicura riga User Prisma per l'utente Supabase autenticato
// 3. redirect role-based via getDashboardPath (override con ?next=/path)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const next = searchParams.get("next")
  const errorDescription = searchParams.get("error_description")

  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription)}`,
    )
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    console.error("[auth/callback] exchange failed", error)
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
  }

  const authUser = data.user
  if (!authUser) {
    return NextResponse.redirect(`${origin}/login?error=no_user`)
  }

  // Sync Prisma User. Per OAuth-first signup (Google direct, no invite
  // pre-esistente) creiamo User con role default PARENT. Per invite-first
  // (admin ha già fatto inviteUserByEmail), il record User esiste già.
  const existing = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { id: true, role: true, isActive: true },
  })

  if (!existing) {
    const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>
    const fullName =
      typeof meta.full_name === "string" ? meta.full_name : null
    const [firstName, ...rest] = (fullName ?? "").trim().split(/\s+/)
    const lastName = rest.join(" ") || null

    await prisma.user.create({
      data: {
        id: authUser.id,
        email: authUser.email ?? "",
        role: "PARENT",
        firstName: firstName || null,
        lastName: lastName || null,
        isActive: true,
      },
    })

    return NextResponse.redirect(`${origin}/parent/dashboard`)
  }

  if (!existing.isActive) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?error=account_disabled`)
  }

  const target = next && next.startsWith("/") ? next : getDashboardPath(existing.role)
  return NextResponse.redirect(`${origin}${target}`)
}
