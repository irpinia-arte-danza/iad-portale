import { beforeEach, describe, expect, it, vi } from "vitest"

// updateGuardianRelation con un Prisma finto: il grado di parentela cambia,
// i flag restano quelli, e l'audit dice solo cosa è cambiato (#53).

const ROW_ID = "80f01ba8-5f62-4273-adbd-2ccb2597ac41"

const state = {
  row: {} as Record<string, unknown>,
  // Scheda genitore: le altre figlie dello stesso genitore, per id
  others: {} as Record<string, Record<string, unknown>>,
  updates: [] as Array<Record<string, unknown>>,
  audits: [] as Array<Record<string, unknown>>,
}

vi.mock("next/cache", () => ({ revalidatePath: () => {} }))
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: async () => ({ userId: "u-admin" }) }))
vi.mock("@/lib/audit/log-audit", () => ({
  logAudit: async (entry: Record<string, unknown>) => {
    state.audits.push(entry)
  },
}))
vi.mock("@/lib/prisma", () => {
  const tx = {
    athleteParent: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id in state.others ? { ...state.others[where.id] } : { ...state.row },
      updateMany: async () => ({ count: 0 }),
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        state.updates.push(data)
        if (where.id in state.others) {
          state.others[where.id] = { ...state.others[where.id], ...data }
          return { athleteId: state.others[where.id].athleteId }
        }
        state.row = { ...state.row, ...data }
        return { athleteId: state.row.athleteId }
      },
    },
  }
  return {
    prisma: {
      $transaction: async (fn: (t: typeof tx) => unknown) => fn(tx),
    },
  }
})

const { updateGuardianRelation } = await import("./guardians-actions")

const flags = {
  isPrimaryContact: true,
  isPrimaryPayer: true,
  isPickupAuthorized: false,
  hasParentalAuthority: true,
}

describe("updateGuardianRelation: grado di parentela", () => {
  beforeEach(() => {
    state.row = { athleteId: "d1000000-0000-4000-8000-000000000001", relationship: "MOTHER", ...flags }
    state.others = {}
    state.updates = []
    state.audits = []
  })

  it("madre → padre: riga aggiornata, flag invariati, audit con il solo campo cambiato", async () => {
    const result = await updateGuardianRelation(ROW_ID, { relationship: "FATHER", ...flags })
    expect(result).toEqual({ ok: true })
    expect(state.row).toMatchObject({ relationship: "FATHER", ...flags })
    expect(state.audits).toHaveLength(1)
    expect(state.audits[0]).toMatchObject({
      action: "GUARDIAN_LINK",
      entityType: "AthleteParent",
      entityId: ROW_ID,
      changes: { update: true, fields: ["relationship"] },
    })
  })

  it("nessun cambiamento: audit senza campi", async () => {
    await updateGuardianRelation(ROW_ID, { relationship: "MOTHER", ...flags })
    expect(state.audits[0]).toMatchObject({ changes: { fields: [] } })
  })
})

describe("dalla scheda genitore: una figlia sola", () => {
  const EVA_ROW = "d2d06be7-44f6-4ca3-ab23-646c8e90e2ec"

  beforeEach(() => {
    state.row = { athleteId: "mia", parentId: "anna", relationship: "MOTHER", ...flags }
    state.others = {
      [EVA_ROW]: { athleteId: "eva", parentId: "anna", relationship: "MOTHER", ...flags },
    }
    state.updates = []
    state.audits = []
  })

  it("Madre → Padre per Mia: Mia aggiornata, Eva invariata", async () => {
    const result = await updateGuardianRelation(ROW_ID, { relationship: "FATHER", ...flags })
    expect(result).toEqual({ ok: true })
    expect(state.row).toMatchObject({ athleteId: "mia", relationship: "FATHER", ...flags })
    expect(state.others[EVA_ROW]).toEqual({
      athleteId: "eva",
      parentId: "anna",
      relationship: "MOTHER",
      ...flags,
    })
    expect(state.updates).toHaveLength(1)
  })
})
