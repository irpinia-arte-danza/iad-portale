import { describe, expect, it } from "vitest"

import type { AccessStatus } from "@/lib/auth/access-status-types"

import {
  PARENTS_FILTERS,
  PARENTS_WITHOUT_ACCESS_FILTER,
  matchesParentsFilter,
  parentsFilterCounts,
  parseParentsFilter,
  type ParentsFilter,
} from "./list-filters"

const STATUSES: Record<string, AccessStatus> = {
  mai1: { kind: "NEVER_INVITED" },
  mai2: { kind: "NEVER_INVITED" },
  invitato: {
    kind: "INVITED",
    invitedAt: new Date("2026-09-20T10:00:00.000Z"),
    deliveryProblem: false,
  },
  attivo: { kind: "ACTIVE", lastSignInAt: null },
  senzaEmail: { kind: "NO_EMAIL" },
}
// "sconosciuto" non ha uno stato calcolato: vale come senza email
const IDS = [...Object.keys(STATUSES), "sconosciuto"]

describe("filtri dell'elenco genitori", () => {
  it("ogni chip conta le righe che apre", () => {
    const counts = parentsFilterCounts(IDS, STATUSES)
    for (const filter of Object.keys(PARENTS_FILTERS) as ParentsFilter[]) {
      const rows = IDS.filter((id) => matchesParentsFilter(STATUSES[id], filter))
      expect(rows.length, filter).toBe(counts[filter])
    }
    expect(counts).toEqual({
      tutti: 6,
      "senza-accesso": 2,
      invitati: 1,
      "con-accesso": 1,
    })
  })

  it("«Mai invitati» è il numero del riquadro «Genitori senza accesso»", () => {
    // Il riquadro conta chi ha stato NEVER_INVITED (listNeverInvitedIds)
    const riquadro = IDS.filter(
      (id) => STATUSES[id]?.kind === "NEVER_INVITED",
    ).length
    expect(
      parentsFilterCounts(IDS, STATUSES)[PARENTS_WITHOUT_ACCESS_FILTER],
    ).toBe(riquadro)
  })

  it("chi è senza email sta solo in «Tutti»", () => {
    const counts = parentsFilterCounts(IDS, STATUSES)
    const neiTre =
      counts["senza-accesso"] + counts.invitati + counts["con-accesso"]
    expect(counts.tutti - neiTre).toBe(2)
  })

  it("il valore del riquadro della dashboard resta valido", () => {
    expect(parseParentsFilter("senza-accesso")).toBe("senza-accesso")
  })

  it("un filtro inventato viene ignorato", () => {
    expect(parseParentsFilter("qualcosa")).toBeNull()
    expect(parseParentsFilter(undefined)).toBeNull()
  })
})
