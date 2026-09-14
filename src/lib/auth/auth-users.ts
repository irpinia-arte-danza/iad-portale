import "server-only"

import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"

// Le credenziali vivono in auth.users (schema gestito da Supabase, non da
// Prisma). Qui solo letture: la connessione Prisma (ruolo postgres) può
// leggere lo schema auth. Ogni modifica passa dall'admin API Supabase.

export type AuthUserInfo = {
  id: string
  email: string | null
  emailConfirmedAt: Date | null
  lastSignInAt: Date | null
  hasPassword: boolean
}

type AuthUserRow = {
  id: string
  email: string | null
  email_confirmed_at: Date | null
  last_sign_in_at: Date | null
  has_password: boolean
}

function toInfo(row: AuthUserRow): AuthUserInfo {
  return {
    id: row.id,
    email: row.email,
    emailConfirmedAt: row.email_confirmed_at,
    lastSignInAt: row.last_sign_in_at,
    hasPassword: row.has_password,
  }
}

export async function getAuthUsersByIds(
  ids: string[],
): Promise<Map<string, AuthUserInfo>> {
  const unique = [...new Set(ids)]
  if (unique.length === 0) return new Map()

  const rows = await prisma.$queryRaw<AuthUserRow[]>(Prisma.sql`
    SELECT
      id::text AS id,
      email::text AS email,
      email_confirmed_at,
      last_sign_in_at,
      (encrypted_password IS NOT NULL AND encrypted_password <> '') AS has_password
    FROM auth.users
    WHERE id = ANY(${unique}::uuid[])
  `)

  return new Map(rows.map((row) => [row.id, toInfo(row)]))
}

export async function findAuthUserByEmail(
  email: string,
): Promise<AuthUserInfo | null> {
  const rows = await prisma.$queryRaw<AuthUserRow[]>(Prisma.sql`
    SELECT
      id::text AS id,
      email::text AS email,
      email_confirmed_at,
      last_sign_in_at,
      (encrypted_password IS NOT NULL AND encrypted_password <> '') AS has_password
    FROM auth.users
    WHERE lower(email) = lower(${email})
    LIMIT 1
  `)

  return rows[0] ? toInfo(rows[0]) : null
}
