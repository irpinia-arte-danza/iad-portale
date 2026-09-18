import { describe, expect, it } from "vitest"

import { athleteAccessEligibility } from "./athlete-access"

function day(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`)
}

const OGGI = day("2026-09-18")
const MAGGIORENNE = day("2005-04-02")
const MINORENNE = day("2015-03-12")

describe("chi può avere un accesso proprio", () => {
  // Il caso del corso adulti: Simona Sica
  it("una maggiorenne senza genitori collegati sì", () => {
    expect(
      athleteAccessEligibility({
        dateOfBirth: MAGGIORENNE,
        linkedParents: 0,
        at: OGGI,
      }),
    ).toEqual({ ok: true })
  })

  it("una minorenne no, e il motivo lo dice", () => {
    const result = athleteAccessEligibility({
      dateOfBirth: MINORENNE,
      linkedParents: 0,
      at: OGGI,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe("MINOR")
    expect(result.message).toContain("genitore")
  })

  // Due account sugli stessi dati, senza sapere chi paga, confondono e basta
  it("una maggiorenne con un genitore collegato no", () => {
    const result = athleteAccessEligibility({
      dateOfBirth: MAGGIORENNE,
      linkedParents: 1,
      at: OGGI,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe("HAS_PARENT")
  })

  // La minore età viene prima: a una minorenne non si dà accesso comunque,
  // e dire "ha un genitore collegato" sarebbe un motivo secondario
  it("su una minorenne con genitore prevale la minore età", () => {
    const result = athleteAccessEligibility({
      dateOfBirth: MINORENNE,
      linkedParents: 2,
      at: OGGI,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe("MINOR")
  })

  it("l'età si valuta alla data indicata", () => {
    const compieOggi = { dateOfBirth: day("2008-09-18"), linkedParents: 0 }
    expect(
      athleteAccessEligibility({ ...compieOggi, at: day("2026-09-17") }).ok,
    ).toBe(false)
    expect(athleteAccessEligibility({ ...compieOggi, at: OGGI }).ok).toBe(true)
  })
})
