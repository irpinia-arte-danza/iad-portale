import { describe, expect, it } from "vitest"

import {
  bulkSelectionSummary,
  deliveryLabel,
  deliveryState,
  isToDeliver,
  type DeliveryInput,
} from "./delivery"

const NONE: DeliveryInput = {
  status: "VALID",
  emailSentAt: null,
  sharedAt: null,
  handDeliveredAt: null,
}
const d = (iso: string) => new Date(`${iso}T10:00:00.000Z`)

describe("quando una ricevuta è consegnata", () => {
  it("mai uscita: da consegnare", () => {
    const state = deliveryState(NONE)
    expect(state.delivered).toBe(false)
    expect(isToDeliver(state)).toBe(true)
    expect(deliveryLabel(state)).toEqual({
      text: "Da consegnare",
      tone: "fix",
    })
  })

  it("inviata per email", () => {
    const state = deliveryState({ ...NONE, emailSentAt: d("2026-09-28") })
    expect(isToDeliver(state)).toBe(false)
    expect(deliveryLabel(state).text).toBe("Inviata il 28/09/2026")
  })

  it("condivisa dal gestionale", () => {
    const state = deliveryState({ ...NONE, sharedAt: d("2026-09-28") })
    expect(isToDeliver(state)).toBe(false)
    expect(deliveryLabel(state).text).toBe("Condivisa il 28/09/2026")
  })

  it("consegnata a mano", () => {
    const state = deliveryState({ ...NONE, handDeliveredAt: d("2026-09-28") })
    expect(isToDeliver(state)).toBe(false)
    expect(deliveryLabel(state).text).toBe("Consegnata a mano il 28/09/2026")
  })

  it("annullata: non è da consegnare, e si vede che è annullata", () => {
    const state = deliveryState({ ...NONE, status: "CANCELLED" })
    expect(isToDeliver(state)).toBe(false)
    expect(deliveryLabel(state)).toEqual({ text: "Annullata", tone: "neutral" })
  })

  it("annullata dopo essere stata inviata: resta annullata", () => {
    const state = deliveryState({
      ...NONE,
      status: "CANCELLED",
      emailSentAt: d("2026-09-28"),
    })
    expect(isToDeliver(state)).toBe(false)
    expect(deliveryLabel(state).text).toBe("Annullata")
  })

  it("vale l'ultima uscita, qualunque sia il modo", () => {
    const state = deliveryState({
      status: "VALID",
      emailSentAt: d("2026-09-20"),
      sharedAt: d("2026-09-28"),
      handDeliveredAt: d("2026-09-25"),
    })
    expect(state.last?.channel).toBe("SHARE")
    expect(deliveryLabel(state).text).toBe("Condivisa il 28/09/2026")
  })
})

describe("barra della selezione", () => {
  const conEmail = { emailBlocker: null }
  const senzaEmail = { emailBlocker: "La ricevuta non ha l'email del pagante" }

  it("5 selezionate di cui 2 senza email", () => {
    const summary = bulkSelectionSummary([
      conEmail,
      conEmail,
      conEmail,
      senzaEmail,
      senzaEmail,
    ])
    expect(summary.withEmail).toBe(3)
    expect(summary.withoutEmail).toBe(2)
    expect(summary.label).toBe("3 email · 2 senza email, da dare a mano")
  })

  it("tutte con email: nessuna nota", () => {
    expect(bulkSelectionSummary([conEmail, conEmail]).label).toBe("2 email")
  })

  it("nessuna con email: zero da inviare", () => {
    const summary = bulkSelectionSummary([senzaEmail])
    expect(summary.withEmail).toBe(0)
    expect(summary.label).toBe("0 email · 1 senza email, da dare a mano")
  })
})
