import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// «Apri PDF» del referente: la tessera si apre solo se sta nella sua lista
// (cardManagerCardsWhere, applicato da un Prisma finto che legge davvero il
// where), ogni apertura va nell'audit, e un id fuori lista è 404.

type Card = {
  id: string
  entity: "ENDAS" | "CSEN"
  cardYear: number
  deletedAt: Date | null
  filePath: string | null
  athlete: { deletedAt: Date | null; status: "ACTIVE" | "TRIAL" | "SUSPENDED" | "WITHDRAWN" }
}

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`
const ok = { deletedAt: null, status: "ACTIVE" as const }

const CARDS: Card[] = [
  { id: id(1), entity: "ENDAS", cardYear: 2025, deletedAt: null, filePath: "a1/2025.pdf", athlete: ok },
  { id: id(2), entity: "ENDAS", cardYear: 2025, deletedAt: null, filePath: null, athlete: ok },
  { id: id(3), entity: "ENDAS", cardYear: 2024, deletedAt: null, filePath: "a3/2024.pdf", athlete: ok },
  { id: id(4), entity: "CSEN", cardYear: 2025, deletedAt: null, filePath: "a4/2025.pdf", athlete: ok },
  { id: id(5), entity: "ENDAS", cardYear: 2025, deletedAt: null, filePath: "a5/2025.pdf", athlete: { deletedAt: null, status: "WITHDRAWN" } },
  { id: id(6), entity: "ENDAS", cardYear: 2025, deletedAt: new Date(), filePath: "a6/2025.pdf", athlete: ok },
  { id: id(7), entity: "ENDAS", cardYear: 2025, deletedAt: null, filePath: "a7/2025.pdf", athlete: { deletedAt: new Date(), status: "ACTIVE" } },
  { id: id(8), entity: "ENDAS", cardYear: 2025, deletedAt: null, filePath: "a8/2025.pdf", athlete: { deletedAt: null, status: "SUSPENDED" } },
]

type Where = {
  id: string
  deletedAt: null
  entity: string
  cardYear: number
  athlete: { deletedAt: null; status: { not: string } }
}

function matches(card: Card, where: Where): boolean {
  return (
    card.id === where.id &&
    card.deletedAt === where.deletedAt &&
    card.entity === where.entity &&
    card.cardYear === where.cardYear &&
    card.athlete.deletedAt === where.athlete.deletedAt &&
    card.athlete.status !== where.athlete.status.not
  )
}

const state = { audits: [] as Array<Record<string, unknown>>, signed: [] as string[] }

vi.mock("@/lib/auth/require-card-manager", () => ({
  requireCardManager: async () => ({ userId: "u-referente" }),
}))
vi.mock("@/lib/cards/import-data", () => ({ currentSeasonYearData: async () => 2025 }))
vi.mock("@/app/(admin)/admin/tessere/queries", () => ({ tesseramentoQueueWhere: vi.fn() }))
vi.mock("@/lib/supabase/storage-affiliation-card", () => ({
  getAffiliationCardSignedUrl: async (path: string) => {
    state.signed.push(path)
    return `https://storage.test/sign/${path}?token=t`
  },
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    affiliation: {
      findFirst: async ({ where }: { where: Where }) => {
        const card = CARDS.find((c) => matches(c, where))
        return card ? { filePath: card.filePath } : null
      },
    },
    auditLog: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        state.audits.push(data)
        return data
      },
    },
  },
}))

const { GET } = await import("./route")

function open(cardId: string) {
  return GET(new NextRequest(`https://area.test/tessere/pdf/${cardId}`), {
    params: Promise.resolve({ cardId }),
  })
}

describe("GET /tessere/pdf/[cardId]", () => {
  beforeEach(() => {
    state.audits = []
    state.signed = []
  })

  it("tessera della lista con PDF: redirect al link firmato, audit con referente e tessera", async () => {
    const response = await open(id(1))
    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe("https://storage.test/sign/a1/2025.pdf?token=t")
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(state.audits).toEqual([
      {
        userId: "u-referente",
        action: "EXPORT",
        entityType: "Affiliation",
        entityId: id(1),
        changes: { change: "CARD_PDF_OPEN", by: "CARD_MANAGER" },
      },
    ])
  })

  it("allieva sospesa (non ritirata) resta nella lista: si apre", async () => {
    expect((await open(id(8))).status).toBe(303)
  })

  it.each([
    [id(2), "senza PDF"],
    [id(3), "altra stagione"],
    [id(4), "CSEN"],
    [id(5), "allieva ritirata"],
    [id(6), "tessera nel cestino"],
    [id(7), "allieva nel cestino"],
    [id(99), "id inesistente"],
    ["non-un-uuid", "id non valido"],
  ])("%s (%s) → 404, niente link, niente audit", async (cardId) => {
    const response = await open(cardId)
    expect(response.status).toBe(404)
    expect(state.signed).toEqual([])
    expect(state.audits).toEqual([])
  })
})
