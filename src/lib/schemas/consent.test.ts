import { describe, expect, it } from "vitest"

import { CONSENT_KINDS, consentSchema, isConsentKind } from "./consent"

describe("consentSchema", () => {
  const valid = {
    kinds: ["GDPR", "IMAGE_RELEASE_INTERNAL"],
    alsoFor: [],
    signedOn: new Date("2026-09-10T00:00:00.000Z"),
    signedBy: "11111111-1111-4111-8111-111111111111",
    notes: "",
  }

  it("accetta un consenso cartaceo completo", () => {
    expect(consentSchema.safeParse(valid).success).toBe(true)
  })

  it("rifiuta una firma nel futuro", () => {
    const future = new Date()
    future.setUTCDate(future.getUTCDate() + 2)
    const result = consentSchema.safeParse({ ...valid, signedOn: future })
    expect(result.success).toBe(false)
  })

  it("rifiuta un tipo sconosciuto e la firma senza firmatario", () => {
    expect(consentSchema.safeParse({ ...valid, kinds: ["REGULATION"] }).success).toBe(
      false,
    )
    expect(consentSchema.safeParse({ ...valid, signedBy: "  " }).success).toBe(
      false,
    )
  })

  it("serve almeno un consenso, e le sorelle sono id validi", () => {
    expect(consentSchema.safeParse({ ...valid, kinds: [] }).success).toBe(false)
    expect(
      consentSchema.safeParse({ ...valid, alsoFor: ["non-un-id"] }).success,
    ).toBe(false)
    expect(
      consentSchema.safeParse({
        ...valid,
        alsoFor: ["22222222-2222-4222-8222-222222222222"],
      }).success,
    ).toBe(true)
  })

  it("i tre tipi registrabili sono privacy e le due liberatorie", () => {
    expect(CONSENT_KINDS).toEqual([
      "GDPR",
      "IMAGE_RELEASE_INTERNAL",
      "IMAGE_RELEASE_PUBLIC",
    ])
    expect(isConsentKind("GDPR")).toBe(true)
    expect(isConsentKind("IMAGE_RELEASE")).toBe(false)
  })
})
