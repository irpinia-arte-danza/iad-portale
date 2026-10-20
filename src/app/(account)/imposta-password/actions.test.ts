import { beforeEach, describe, expect, it, vi } from "vitest"

import { needsPassword } from "@/lib/auth/password-gate"

// setOwnPassword con Supabase finto: dopo il salvataggio app_metadata ha
// password_set = true (scritto con la service role) e la regola del proxy
// lascia passare. Chi non ha mai scelto una password non deve inserire
// quella «attuale», anche fuori dai 15 minuti del link.

class RedirectError extends Error {
  constructor(public readonly to: string) {
    super(`redirect ${to}`)
  }
}

const now = Math.floor(Date.now() / 1000)

const state = {
  appMetadata: { provider: "email" } as Record<string, unknown>,
  amr: [{ method: "invite", timestamp: now - 3600 }],
  flagWrites: [] as Array<{ id: string; attrs: { app_metadata: Record<string, unknown> } }>,
  passwordUpdates: 0,
}

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new RedirectError(to)
  },
}))
vi.mock("next/server", () => ({ after: () => {} }))
vi.mock("@/lib/auth/current-account", () => ({
  getCurrentAccount: async () => ({
    state: "ok",
    userId: "u-ref",
    role: "CARD_MANAGER",
    parentId: null,
    teacherId: null,
    athleteId: null,
  }),
  passwordMissing: async () =>
    needsPassword({ app_metadata: state.appMetadata }, { amr: state.amr }),
}))
vi.mock("@/lib/auth/mfa", () => ({
  getSessionLevel: async () => ({ aal: "aal1", sessionId: "s1" }),
  hasRecoveryPass: async () => false,
  verifiedTotpFactor: async () => null,
}))
vi.mock("@/lib/auth/password-changed-email", () => ({ sendPasswordChangedNotice: async () => {} }))
vi.mock("@/lib/prisma", () => ({ prisma: { auditLog: { create: async () => ({}) } } }))
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: { id: "u-ref", email: "ref@prova.local", app_metadata: state.appMetadata } },
      }),
      getClaims: async () => ({ data: { claims: { amr: state.amr } }, error: null }),
      updateUser: async () => {
        state.passwordUpdates += 1
        return { error: null }
      },
      signOut: async () => ({ error: null }),
    },
  }),
}))
vi.mock("@/lib/supabase/admin-client", () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        updateUserById: async (id: string, attrs: { app_metadata: Record<string, unknown> }) => {
          state.flagWrites.push({ id, attrs })
          state.appMetadata = attrs.app_metadata
          return { data: {}, error: null }
        },
      },
    },
  }),
}))

const { setOwnPassword } = await import("./actions")

async function redirectOf(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn()
    return null
  } catch (error) {
    if (error instanceof RedirectError) return error.to
    throw error
  }
}

const values = { currentPassword: "", newPassword: "unapasswordlunga1", confirmPassword: "unapasswordlunga1" }

describe("setOwnPassword e il flag password_set", () => {
  beforeEach(() => {
    state.appMetadata = { provider: "email" }
    state.amr = [{ method: "invite", timestamp: now - 3600 }]
    state.flagWrites = []
    state.passwordUpdates = 0
  })

  it("prima: la regola del proxy rimanda a /imposta-password", () => {
    expect(needsPassword({ app_metadata: state.appMetadata }, { amr: state.amr })).toBe(true)
  })

  it("dopo: flag true in app_metadata, le aree si aprono, si va alla dashboard", async () => {
    // Invito aperto un'ora fa e lasciato a metà: niente password attuale
    expect(await redirectOf(() => setOwnPassword(values))).toBe("/tessere")
    expect(state.passwordUpdates).toBe(1)
    expect(state.flagWrites).toEqual([
      { id: "u-ref", attrs: { app_metadata: { provider: "email", password_set: true } } },
    ])
    expect(needsPassword({ app_metadata: state.appMetadata }, { amr: state.amr })).toBe(false)
  })

  it("chi la password ce l'ha già, fuori dai 15 minuti, deve dare quella attuale", async () => {
    state.appMetadata = { provider: "email", password_set: true }
    const result = await setOwnPassword(values)
    expect(result).toMatchObject({ ok: false })
    expect(state.passwordUpdates).toBe(0)
  })
})
