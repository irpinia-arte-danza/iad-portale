"use server"

import { redirect } from "next/navigation"
import { after } from "next/server"

import { createServerClient } from "@supabase/ssr"

import { NO_ACCESS_ROUTE } from "@/lib/auth/account-state"
import { getCurrentAccount } from "@/lib/auth/current-account"
import { getDashboardPath } from "@/lib/auth/dashboard-path"
import { sendPasswordChangedNotice } from "@/lib/auth/password-changed-email"
import { isRecentOtpSession } from "@/lib/auth/recent-otp"
import { prisma } from "@/lib/prisma"
import {
  setOwnPasswordSchema,
  type SetOwnPasswordValues,
} from "@/lib/schemas/admin-settings"
import type { ActionResult } from "@/lib/schemas/common"
import { createClient } from "@/lib/supabase/server"

const SESSION_EXPIRED =
  "La sessione è scaduta. Richiedi un nuovo link da «Password dimenticata»."

function mapPasswordError(code: string | undefined): string {
  switch (code) {
    case "same_password":
      return "La nuova password deve essere diversa da quella precedente."
    case "weak_password":
      return "Password troppo debole: usa almeno 10 caratteri, meglio se con lettere e numeri."
    case "session_not_found":
    case "session_expired":
    case "bad_jwt":
    case "reauthentication_needed":
      return SESSION_EXPIRED
    default:
      return "Non è stato possibile salvare la password, riprova."
  }
}

// La sessione viene da un invito o da un recupero aperti negli ultimi 15
// minuti? Lo dice il claim amr del JWT, letto e verificato da Supabase.
export async function sessionFromRecentLink(): Promise<boolean> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) return false
  return isRecentOtpSession(data.claims)
}

// La password attuale si verifica con un client senza cookie: se è giusta
// Supabase apre una sessione che non viene salvata da nessuna parte, se è
// sbagliata risponde con l'errore delle credenziali.
async function currentPasswordIsValid(
  email: string,
  password: string,
): Promise<boolean> {
  const probe = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  )
  const { error } = await probe.auth.signInWithPassword({ email, password })
  return !error
}

// Unica action «scegli password» per tutti i ruoli (primo accesso e
// recupero). Senza un link personale appena aperto serve la password
// attuale: una sessione lasciata aperta su un telefono non deve bastare a
// prendersi l'account. Dopo il salvataggio: via le altre sessioni, email di
// avviso all'interessato, dashboard del proprio ruolo. Nessun parametro
// "next" da validare.
export async function setOwnPassword(
  values: SetOwnPasswordValues,
): Promise<ActionResult> {
  const account = await getCurrentAccount()
  if (account.state === "anonymous") {
    return { ok: false, error: SESSION_EXPIRED }
  }
  if (account.state === "blocked") {
    redirect(NO_ACCESS_ROUTE)
  }

  const parsed = setOwnPasswordSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Password non valida",
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return { ok: false, error: SESSION_EXPIRED }

  if (!(await sessionFromRecentLink())) {
    const current = parsed.data.currentPassword
    if (!current) {
      return {
        ok: false,
        error:
          "Inserisci la password attuale, oppure richiedi un link da «Password dimenticata».",
      }
    }
    if (!(await currentPasswordIsValid(user.email, current))) {
      return { ok: false, error: "La password attuale non è corretta." }
    }
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  })
  if (error) {
    console.error("[set-password] updateUser failed", { code: error.code })
    return { ok: false, error: mapPasswordError(error.code) }
  }

  // Le altre sessioni (altro telefono, altro browser) cadono: resta solo
  // questa, che ha appena dimostrato di conoscere la password
  const { error: signOutError } = await supabase.auth.signOut({ scope: "others" })
  if (signOutError) {
    console.error("[set-password] signOut others failed", { code: signOutError.code })
  }

  const changedAt = new Date()
  await prisma.auditLog.create({
    data: {
      userId: account.userId,
      action: "CHANGE_PASSWORD",
      entityType: "User",
      entityId: account.userId,
    },
  })

  const email = user.email
  const userId = account.userId
  after(async () => {
    try {
      const profile = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true },
      })
      await sendPasswordChangedNotice({
        userId,
        email,
        firstName: profile?.firstName ?? null,
        changedAt,
      })
    } catch (error) {
      console.error("[set-password] notice email failed", {
        message: error instanceof Error ? error.message : "unknown",
      })
    }
  })

  redirect(getDashboardPath(account.role))
}
