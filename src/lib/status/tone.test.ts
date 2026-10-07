import { describe, expect, it } from "vitest"

import { statusTone, TONE_BADGE, type StatusTone } from "./tone"

describe("quando una cosa blocca e quando no", () => {
  it("certificato: manca o è scaduto = blocca", () => {
    expect(statusTone({ kind: "certificate", status: "missing" })).toBe("block")
    expect(statusTone({ kind: "certificate", status: "expired" })).toBe("block")
  })

  it("certificato in scadenza avvisa, valido è neutro", () => {
    expect(statusTone({ kind: "certificate", status: "expiring" })).toBe("fix")
    expect(statusTone({ kind: "certificate", status: "valid" })).toBe("neutral")
  })

  it("tessera assente o scaduta = blocca: senza tessera non è assicurata", () => {
    expect(statusTone({ kind: "card", status: "missing" })).toBe("block")
    expect(statusTone({ kind: "card", status: "expired" })).toBe("block")
    expect(statusTone({ kind: "card", status: "expiring" })).toBe("fix")
    expect(statusTone({ kind: "card", status: "valid" })).toBe("neutral")
  })

  it("minorenne senza genitore = blocca", () => {
    expect(statusTone({ kind: "guardian", missing: true })).toBe("block")
    expect(statusTone({ kind: "guardian", missing: false })).toBe("neutral")
  })

  it("contributi in ritardo = da sistemare, non blocca", () => {
    expect(statusTone({ kind: "contributions", overdue: true })).toBe("fix")
    expect(statusTone({ kind: "contributions", overdue: false })).toBe("neutral")
  })

  it("ricevuta da consegnare = da sistemare; annullata è neutra", () => {
    expect(statusTone({ kind: "receipt", toDeliver: true })).toBe("fix")
    expect(statusTone({ kind: "receipt", toDeliver: false })).toBe("neutral")
    expect(
      statusTone({ kind: "receipt", toDeliver: true, cancelled: true }),
    ).toBe("neutral")
  })

  it("genitore mai invitato = da sistemare", () => {
    expect(statusTone({ kind: "access", invited: false })).toBe("fix")
    expect(statusTone({ kind: "access", invited: true })).toBe("neutral")
  })

  it("i passi della scheda seguono la stessa regola", () => {
    expect(statusTone({ kind: "setupStep", step: "certificate" })).toBe("block")
    expect(statusTone({ kind: "setupStep", step: "card" })).toBe("block")
    expect(statusTone({ kind: "setupStep", step: "guardian" })).toBe("block")
    expect(statusTone({ kind: "setupStep", step: "email" })).toBe("fix")
    expect(statusTone({ kind: "setupStep", step: "course" })).toBe("fix")
  })

  it("il neutro non porta classi di colore", () => {
    expect(TONE_BADGE.neutral).toBe("")
    for (const tone of ["block", "fix"] as StatusTone[]) {
      expect(TONE_BADGE[tone]).toContain(`status-${tone}`)
      // Niente colori di Tailwind: solo i token
      expect(TONE_BADGE[tone]).not.toMatch(/red-|amber-|rose-|orange-/)
    }
  })
})

// L'area genitori usa gli stessi toni del gestionale (§17.43): una rata
// scaduta è ambra «da pagare», mai rossa; il rosso resta a certificato e
// tessera mancanti o scaduti, che tengono l'allieva fuori dalla sala.
describe("tono del genitore", () => {
  it("rata scaduta → fix (ambra, «da pagare»), mai block", () => {
    expect(statusTone({ kind: "contributions", overdue: true })).toBe("fix")
    expect(statusTone({ kind: "contributions", overdue: true })).not.toBe("block")
    expect(statusTone({ kind: "contributions", overdue: false })).toBe("neutral")
  })

  it("certificato assente o scaduto → block («senza certificato non può fare lezione»)", () => {
    expect(statusTone({ kind: "certificate", status: "missing" })).toBe("block")
    expect(statusTone({ kind: "certificate", status: "expired" })).toBe("block")
  })

  it("certificato in scadenza → fix, valido → neutral", () => {
    expect(statusTone({ kind: "certificate", status: "expiring" })).toBe("fix")
    expect(statusTone({ kind: "certificate", status: "valid" })).toBe("neutral")
  })

  it("tessera assente o scaduta → block, come il certificato", () => {
    expect(statusTone({ kind: "card", status: "missing" })).toBe("block")
    expect(statusTone({ kind: "card", status: "expired" })).toBe("block")
  })
})
