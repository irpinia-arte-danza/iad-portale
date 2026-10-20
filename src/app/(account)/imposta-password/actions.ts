"use server"

import { redirect } from "next/navigation"
import { after } from "next/server"

import { createServerClient } from "@supabase/ssr"

import { NO_ACCESS_ROUTE } from "@/lib/auth/account-state"
import { getCurrentAccount, passwordMissing } from "@/lib/auth/current-account"
import { getDashboardPath } from "@/lib/auth/dashboard-path"
import { getSessionLevel, hasRecoveryPass, verifiedTotpFactor } from "@/lib/auth/mfa"
import { adminGate, MFA_VERIFY_PATH } from "@/lib/auth/mfa-gate"
import { sendPasswordChangedNotice } from "@/lib/auth/password-changed-email"
import { PASSWORD_SET_KEY } from "@/lib/auth/password-gate"
import { passwordErrorMessage, SESSION_EXPIRED_MESSAGE } from "@/lib/auth/password-policy"
import { isRecentOtpSession } from "@/lib/auth/recent-otp"
import { prisma } from "@/lib/prisma"
import {
  setOwnPasswordSchema,
  type SetOwnPasswordValues,
} from "@/lib/schemas/admin-settings"
import type { ActionResult } from "@/lib/schemas/common"
import { createAdminClient } from "@/lib/supabase/admin-client"
import { createClient } from "@/lib/supabase/server"

const SESSION_EXPIRED = SESSION_EXPIRED_MESSAGE

// La sessione viene da un invito o da un recupero aperti negli ultimi 15
// minuti? Lo dice il claim amr del JWT, letto e verificato da Supabase.
export async function sessionFromRecentLink(): Promise<boolean> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims) return false
  return isRecentOtpSession(data.claims)
}

// Serve la password attuale? No se la sessione viene da un link appena
// aperto, e no se una password non c'è mai stata (invito aperto e poi
// lasciato a metà: password-gate.ts). Stessa regola per pagina e action.
export async function currentPasswordRequired(): Promise<boolean> {
  if (await sessionFromRecentLink()) return false
  return !(await passwordMissing())
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

  // Un admin con il secondo fattore attivo cambia la password solo con una
  // sessione aal2 (o il lasciapassare del codice di recupero). Un admin
  // appena invitato, senza fattore, deve prima poter scegliere la password:
  // il secondo fattore glielo chiede subito dopo.
  if (account.role === "ADMIN" && (await verifiedTotpFactor(supabase))) {
    const level = await getSessionLevel()
    const recoveryPass = await hasRecoveryPass(account.userId, level.sessionId)
    if (adminGate({ role: account.role, aal: level.aal, recoveryPass }) !== "ok") {
      redirect(MFA_VERIFY_PATH)
    }
  }

  if (await currentPasswordRequired()) {
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
    return { ok: false, error: passwordErrorMessage(error) }
  }

  // Il flag che apre le aree (password-gate.ts). In app_metadata, che solo
  // la service role scrive: l'utente non può metterselo da solo. Si unisce
  // a quello che c'è già (provider, providers). Se fallisce la password
  // resta salvata, ma il proxy rimanderebbe qui: meglio dirlo subito.
  const { error: flagError } = await createAdminClient().auth.admin.updateUserById(
    user.id,
    { app_metadata: { ...user.app_metadata, [PASSWORD_SET_KEY]: true } },
  )
  if (flagError) {
    console.error("[set-password] password_set flag failed", { code: flagError.code })
    return { ok: false, error: "Password salvata, ma non è stato possibile completare l'accesso: riprova." }
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
