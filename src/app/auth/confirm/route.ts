import { NextResponse, type NextRequest } from "next/server"

import type { EmailOtpType } from "@supabase/supabase-js"

import { prisma } from "@/lib/prisma"
import { getDashboardPath } from "@/lib/auth/dashboard-path"
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

// Custom email template Supabase punta qui per type=invite, recovery,
// signup, email_change. Pattern:
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/parent/dashboard
//
// Workflow:
// 1. verifyOtp(token_hash, type) → sessione cookie SSR
// 2. Sync Prisma User se mancante (defensive: invite admin upsert lo crea già)
// 3. Per type=invite → redirect set-password (primo onboarding)
//    Per altri → redirect next o dashboard role-based
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const tokenHash = searchParams.get("token_hash")
  const typeRaw = searchParams.get("type")
  const nextParam = searchParams.get("next")

  if (!tokenHash || !typeRaw) {
    return NextResponse.redirect(`${origin}/login?error=missing_token`)
  }

  if (!VALID_TYPES.includes(typeRaw as EmailOtpType)) {
    return NextResponse.redirect(`${origin}/login?error=invalid_type`)
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
      error: error?.message,
    })
    return NextResponse.redirect(`${origin}/login?error=verify_failed`)
  }

  const authUser = data.user

  // Sync Prisma User. Per parent invite via admin il record esiste già
  // (upsert in admin/parents/actions.ts). Per signup OAuth-first o casi
  // edge, creiamo qui con role default PARENT.
  let prismaUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { id: true, role: true, isActive: true },
  })

  if (!prismaUser) {
    const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>
    const fullName =
      typeof meta.full_name === "string" ? meta.full_name : null
    const [firstName, ...rest] = (fullName ?? "").trim().split(/\s+/)
    const lastName = rest.join(" ") || null

    prismaUser = await prisma.user.create({
      data: {
        id: authUser.id,
        email: authUser.email ?? "",
        role: "PARENT",
        firstName: firstName || null,
        lastName: lastName || null,
        isActive: true,
      },
      select: { id: true, role: true, isActive: true },
    })
  } else if (!prismaUser.isActive) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?error=account_disabled`)
  }

  const next = nextParam && nextParam.startsWith("/") ? nextParam : null

  // Invite: forza set-password come primo step. next preservato per
  // redirect post-set-password.
  if (type === "invite") {
    const target = next ?? getDashboardPath(prismaUser.role)
    return NextResponse.redirect(
      `${origin}/parent/set-password?next=${encodeURIComponent(target)}`,
    )
  }

  // Recovery: stesso flow set-password (l'utente vuole settare nuova password).
  if (type === "recovery") {
    const target = next ?? getDashboardPath(prismaUser.role)
    return NextResponse.redirect(
      `${origin}/parent/set-password?next=${encodeURIComponent(target)}&recovery=1`,
    )
  }

  // Altri (signup, email_change, magiclink, email): redirect diretto.
  const target = next ?? getDashboardPath(prismaUser.role)
  return NextResponse.redirect(`${origin}${target}`)
}
