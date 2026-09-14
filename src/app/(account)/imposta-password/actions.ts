"use server"

import { redirect } from "next/navigation"

import { NO_ACCESS_ROUTE } from "@/lib/auth/account-state"
import { getCurrentAccount } from "@/lib/auth/current-account"
import { getDashboardPath } from "@/lib/auth/dashboard-path"
import { prisma } from "@/lib/prisma"
import {
  changePasswordSchema,
  type ChangePasswordValues,
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

// Unica action "scegli password" per tutti i ruoli (primo accesso e
// recupero). Dopo il salvataggio porta alla dashboard del proprio ruolo:
// nessun parametro "next" da validare.
export async function setOwnPassword(
  values: ChangePasswordValues,
): Promise<ActionResult> {
  const account = await getCurrentAccount()
  if (account.state === "anonymous") {
    return { ok: false, error: SESSION_EXPIRED }
  }
  if (account.state === "blocked") {
    redirect(NO_ACCESS_ROUTE)
  }

  const parsed = changePasswordSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Password non valida",
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  })
  if (error) {
    console.error("[set-password] updateUser failed", { code: error.code })
    return { ok: false, error: mapPasswordError(error.code) }
  }

  await prisma.auditLog.create({
    data: {
      userId: account.userId,
      action: "CHANGE_PASSWORD",
      entityType: "User",
      entityId: account.userId,
    },
  })

  redirect(getDashboardPath(account.role))
}
