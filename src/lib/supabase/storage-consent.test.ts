import { beforeEach, describe, expect, it, vi } from "vitest"

const createSignedUrl = vi.fn()
const remove = vi.fn()
const from = vi.fn(() => ({ createSignedUrl, remove }))

vi.mock("./admin-client", () => ({
  createAdminClient: () => ({ storage: { from } }),
}))

import {
  CONSENT_BUCKET,
  deleteConsentFiles,
  getConsentFileSignedUrl,
} from "./storage-consent"

beforeEach(() => {
  createSignedUrl.mockReset()
  remove.mockReset()
  from.mockClear()
})

describe("moduli firmati dei consensi", () => {
  it("il link firmato vive 300 secondi, dal bucket privato consents", async () => {
    createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://x/firmato" },
      error: null,
    })
    expect(await getConsentFileSignedUrl("modulo.pdf")).toBe("https://x/firmato")
    expect(from).toHaveBeenCalledWith(CONSENT_BUCKET)
    expect(CONSENT_BUCKET).toBe("consents")
    expect(createSignedUrl).toHaveBeenCalledWith("modulo.pdf", 300)
  })

  it("senza percorso non chiede nessun link", async () => {
    expect(await getConsentFileSignedUrl("")).toBeNull()
    expect(createSignedUrl).not.toHaveBeenCalled()
  })

  it("nessun file da togliere: lo Storage non viene toccato", async () => {
    expect(await deleteConsentFiles([])).toEqual({ removed: 0, error: null })
    expect(remove).not.toHaveBeenCalled()
  })
})
