import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

import { resolveAccountState, type AccountState } from "./account-state"
import { sessionClaimsOf } from "./mfa"
import { needsPassword, SET_PASSWORD_PATH } from "./password-gate"

export type CurrentAccount = { state: "anonymous" } | AccountState

// Un solo getUser() per request, condiviso da getCurrentAccount e dal
// controllo della password
const getAuthUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
})

// Memoizzato per request: layout e pagina chiamano entrambi requireXxx()
// senza duplicare getUser() e query Prisma.
export const getCurrentAccount = cache(async (): Promise<CurrentAccount> => {
  const { user } = await getAuthUser()

  if (!user) return { state: "anonymous" }
  return resolveAccountState(user.id)
})

// La sessione viene da un link personale e la password non è ancora stata
// scelta (regola in password-gate.ts)
export const passwordMissing = cache(async (): Promise<boolean> => {
  const { supabase, user } = await getAuthUser()
  if (!user) return false
  return needsPassword(user, await sessionClaimsOf(supabase))
})

// Seconda linea dietro il proxy, nelle guardie requireXxx(): un'area non si
// apre finché la password non c'è
export async function requirePasswordSet(): Promise<void> {
  if (await passwordMissing()) redirect(`${SET_PASSWORD_PATH}?tipo=benvenuto`)
}
