import { beforeEach, describe, expect, it, vi } from "vitest"

import { UserRole } from "@prisma/client"

import { wrongAreaRedirect } from "./proxy-matcher"

// requireCardManager e requireCardUploader con sessioni finte, e il proxy:
// il referente tessere sta in /tessere e basta.

class RedirectError extends Error {
  constructor(public readonly to: string) {
    super(`redirect ${to}`)
  }
}

const state = {
  account: { state: "ok", role: "CARD_MANAGER", userId: "u-card" } as Record<string, unknown>,
  adminCalls: 0,
}

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new RedirectError(to)
  },
}))
vi.mock("./current-account", () => ({
  getCurrentAccount: async () => state.account,
  requirePasswordSet: async () => {},
}))
vi.mock("./require-admin", () => ({
  requireAdmin: async () => {
    state.adminCalls += 1
    if (state.account.role !== "ADMIN") throw new RedirectError("/denied-by-requireAdmin")
    return { userId: state.account.userId }
  },
}))

const { requireCardManager, requireCardUploader } = await import("./require-card-manager")

async function redirectOf(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn()
    return null
  } catch (error) {
    if (error instanceof RedirectError) return error.to
    throw error
  }
}

function as(role: string, userId = `u-${role.toLowerCase()}`) {
  state.account = { state: "ok", role, userId }
}

describe("requireCardManager", () => {
  beforeEach(() => {
    as("CARD_MANAGER", "u-card")
    state.adminCalls = 0
  })

  it("CARD_MANAGER → ok", async () => {
    expect(await requireCardManager()).toEqual({ userId: "u-card" })
  })

  it("PARENT, TEACHER, ATHLETE → alla propria area", async () => {
    as("PARENT")
    expect(await redirectOf(requireCardManager)).toBe("/parent/dashboard")
    as("TEACHER")
    expect(await redirectOf(requireCardManager)).toBe("/teacher/dashboard")
    as("ATHLETE")
    expect(await redirectOf(requireCardManager)).toBe("/parent/dashboard")
  })

  it("ADMIN → rifiuto: l'admin usa /admin/tessere", async () => {
    as("ADMIN")
    expect(await redirectOf(requireCardManager)).toBe("/admin/dashboard")
  })

  it("anonimo → login, account disattivato (revoca) → no-access", async () => {
    state.account = { state: "anonymous" }
    expect(await redirectOf(requireCardManager)).toBe("/login")
    state.account = { state: "blocked", reason: "inactive" }
    expect(await redirectOf(requireCardManager)).toBe("/auth/no-access")
  })
})

describe("requireCardUploader: admin oppure referente, una regola sola", () => {
  beforeEach(() => {
    state.adminCalls = 0
  })

  it("il referente carica con il suo id, senza passare da requireAdmin", async () => {
    as("CARD_MANAGER", "u-card")
    expect(await requireCardUploader()).toEqual({ userId: "u-card", role: "CARD_MANAGER" })
    expect(state.adminCalls).toBe(0)
  })

  it("l'admin passa da requireAdmin (secondo fattore compreso)", async () => {
    as("ADMIN", "u-admin")
    expect(await requireCardUploader()).toEqual({ userId: "u-admin", role: "ADMIN" })
    expect(state.adminCalls).toBe(1)
  })

  it("genitore e insegnante no", async () => {
    as("PARENT")
    expect(await redirectOf(requireCardUploader)).toBe("/denied-by-requireAdmin")
    as("TEACHER")
    expect(await redirectOf(requireCardUploader)).toBe("/denied-by-requireAdmin")
  })
})

describe("proxy: il referente sta in /tessere", () => {
  it.each(["/admin", "/admin/tessere", "/admin/dashboard", "/parent/dashboard", "/teacher/dashboard"])(
    "CARD_MANAGER su %s → /tessere",
    (path) => {
      expect(wrongAreaRedirect(path, UserRole.CARD_MANAGER)).toBe("/tessere")
    },
  )

  it("CARD_MANAGER su /tessere resta", () => {
    expect(wrongAreaRedirect("/tessere", UserRole.CARD_MANAGER)).toBeNull()
  })

  it("gli altri ruoli su /tessere tornano alla loro area", () => {
    expect(wrongAreaRedirect("/tessere", UserRole.ADMIN)).toBe("/admin/dashboard")
    expect(wrongAreaRedirect("/tessere", UserRole.PARENT)).toBe("/parent/dashboard")
    expect(wrongAreaRedirect("/tessere", UserRole.TEACHER)).toBe("/teacher/dashboard")
  })

  it("/admin/tessere resta area admin", () => {
    expect(wrongAreaRedirect("/admin/tessere", UserRole.ADMIN)).toBeNull()
  })
})
