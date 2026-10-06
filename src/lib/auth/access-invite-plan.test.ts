import { describe, expect, it } from "vitest"

import { planAccessInvites, skippedSummary } from "./access-invite-plan"
import type { AccessStatus } from "./access-status-types"

const c = (id: string, status: AccessStatus) => ({ id, name: `Genitore ${id}`, status })

const MAI: AccessStatus = { kind: "NEVER_INVITED" }
const INVITATO: AccessStatus = {
  kind: "INVITED",
  invitedAt: new Date("2026-09-20T10:00:00.000Z"),
  deliveryProblem: false,
}
const ATTIVO: AccessStatus = { kind: "ACTIVE", lastSignInAt: null }
const SENZA_EMAIL: AccessStatus = { kind: "NO_EMAIL" }

describe("planAccessInvites", () => {
  it("5 selezionati, 1 senza email e 1 con accesso: 3 inviti, 2 saltati col motivo", () => {
    const plan = planAccessInvites([
      c("a", MAI),
      c("b", MAI),
      c("c", SENZA_EMAIL),
      c("d", INVITATO),
      c("e", ATTIVO),
    ])
    expect(plan.recipients.map((r) => r.id)).toEqual(["a", "b", "d"])
    expect(plan.skipped).toEqual([
      { id: "c", name: "Genitore c", reason: "NO_EMAIL" },
      { id: "e", name: "Genitore e", reason: "ALREADY_ACTIVE" },
    ])
    expect(skippedSummary(plan.skipped)).toBe("1 senza email, 1 ha già l'accesso")
  })

  it("chi era già stato invitato riceve un link nuovo: è un reinvio", () => {
    const plan = planAccessInvites([c("a", MAI), c("d", INVITATO)])
    expect(plan.recipients).toEqual([
      { id: "a", name: "Genitore a", reinvite: false },
      { id: "d", name: "Genitore d", reinvite: true },
    ])
  })

  it("nessuno escluso: nessun riepilogo dei saltati", () => {
    const plan = planAccessInvites([c("a", MAI)])
    expect(plan.skipped).toEqual([])
    expect(skippedSummary(plan.skipped)).toBe("")
  })

  it("tutti esclusi: nessun destinatario, e il tasto Invia resta spento", () => {
    const plan = planAccessInvites([c("c", SENZA_EMAIL), c("e", ATTIVO)])
    expect(plan.recipients).toEqual([])
    expect(plan.skipped).toHaveLength(2)
  })

  it("ogni selezionato finisce da una parte o dall'altra, mai perso", () => {
    const selected = [c("a", MAI), c("c", SENZA_EMAIL), c("d", INVITATO), c("e", ATTIVO)]
    const plan = planAccessInvites(selected)
    expect(plan.recipients.length + plan.skipped.length).toBe(selected.length)
  })
})
