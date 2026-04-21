import { createClient } from "@supabase/supabase-js"

let cached: ReturnType<typeof createClient> | null = null

export function createAdminClient() {
  if (cached) return cached

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_URL mancanti: impossibile creare admin client",
    )
  }

  cached = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return cached
}
