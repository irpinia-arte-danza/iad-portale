import "server-only"

import { cache } from "react"

import { createClient } from "@/lib/supabase/server"

import { resolveAccountState, type AccountState } from "./account-state"

export type CurrentAccount = { state: "anonymous" } | AccountState

// Memoizzato per request: layout e pagina chiamano entrambi requireXxx()
// senza duplicare getUser() e query Prisma.
export const getCurrentAccount = cache(async (): Promise<CurrentAccount> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { state: "anonymous" }
  return resolveAccountState(user.id)
})
