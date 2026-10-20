import { beforeEach, describe, expect, it, vi } from "vitest"

// Un caricamento fatto dal referente tessere lascia nell'AuditLog (e in
// createdBy) l'id del referente, non quello di un admin.

const calls = {
  audit: [] as Record<string, unknown>[],
  created: [] as Record<string, unknown>[],
}

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/auth/require-admin", () => ({ requireAdmin: vi.fn() }))
vi.mock("@/lib/auth/require-card-manager", () => ({
  requireCardUploader: async () => ({ userId: "u-referente", role: "CARD_MANAGER" }),
}))
vi.mock("@/lib/cards/import-data", () => ({
  matchCandidatesData: async () => [],
  activeCardsData: async () => [],
}))
vi.mock("@/lib/utils/file-signature", () => ({ detectMimeFromSignature: () => "application/pdf" }))
vi.mock("@/lib/pdf/extract-pdf-text", () => ({ extractPdfText: async () => ({ ok: true, text: "x" }) }))
vi.mock("@/lib/affiliations/parsers", () => ({
  cardParserFor: () => ({
    parse: () => ({
      ok: true,
      card: {
        cardNumber: "ENDAS-123",
        cardType: "A",
        cardYear: 2026,
        issueDate: new Date("2026-10-01"),
        expiryDate: new Date("2027-09-30"),
        person: null,
      },
    }),
  }),
}))
vi.mock("@/lib/supabase/storage-affiliation-card", () => ({
  uploadAffiliationCardFile: async () => ({ filePath: "cards/x.pdf" }),
  getAffiliationCardSignedUrl: vi.fn(),
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    athlete: { findFirst: async () => ({ id: "0b0e7f0e-6c2a-4c0e-9a57-3a2f1d1c9b11" }) },
    affiliation: {
      findFirst: async () => null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        calls.created.push(data)
        return { id: "card-1" }
      },
      update: async () => ({}),
      delete: async () => ({}),
    },
    auditLog: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        calls.audit.push(data)
        return {}
      },
    },
  },
}))

const { importCardFile } = await import("./actions")

describe("caricamento dal referente tessere", () => {
  beforeEach(() => {
    calls.audit.length = 0
    calls.created.length = 0
  })

  it("AuditLog e createdBy con l'id del referente", async () => {
    const form = new FormData()
    form.set("entity", "ENDAS")
    form.set("file", new File(["%PDF-1.4"], "tessera.pdf", { type: "application/pdf" }))
    form.set("athleteId", "0b0e7f0e-6c2a-4c0e-9a57-3a2f1d1c9b11")

    const result = await importCardFile(form)

    expect(result).toMatchObject({ ok: true })
    expect(calls.created[0]).toMatchObject({ createdBy: "u-referente" })
    expect(calls.audit).toHaveLength(1)
    expect(calls.audit[0]).toMatchObject({
      userId: "u-referente",
      action: "CARD_IMPORT",
      entityType: "Affiliation",
    })
  })
})
