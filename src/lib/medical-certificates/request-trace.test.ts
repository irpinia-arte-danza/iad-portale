import { describe, expect, it } from "vitest"

import { certRequestLabel, summarizeCertRequests } from "./request-trace"

const OGGI = new Date("2026-10-06T10:00:00.000Z")
const at = (iso: string) => new Date(iso)

describe("ultima richiesta del certificato", () => {
  it("nessuna richiesta: mai chiesto", () => {
    const s = summarizeCertRequests([])
    expect(s.last).toBeNull()
    expect(certRequestLabel(s, OGGI)).toBe("Mai chiesto")
  })

  it("solo email", () => {
    const s = summarizeCertRequests([
      { at: at("2026-09-28T09:00:00.000Z"), channel: "EMAIL" },
    ])
    expect(certRequestLabel(s, OGGI)).toBe("Chiesto il 28/09/2026 per email")
  })

  it("solo WhatsApp", () => {
    const s = summarizeCertRequests([
      { at: at("2026-09-28T09:00:00.000Z"), channel: "WHATSAPP" },
    ])
    expect(certRequestLabel(s, OGGI)).toBe("Chiesto il 28/09/2026 su WhatsApp")
  })

  it("entrambe: vale la più recente, col suo canale", () => {
    const s = summarizeCertRequests([
      { at: at("2026-09-20T09:00:00.000Z"), channel: "EMAIL" },
      { at: at("2026-10-01T09:00:00.000Z"), channel: "WHATSAPP" },
      { at: at("2026-09-25T09:00:00.000Z"), channel: "EMAIL" },
    ])
    expect(s.count).toBe(3)
    expect(s.last?.channel).toBe("WHATSAPP")
    expect(certRequestLabel(s, OGGI)).toBe("Chiesto il 01/10/2026 su WhatsApp")

    const alContrario = summarizeCertRequests([
      { at: at("2026-10-01T09:00:00.000Z"), channel: "WHATSAPP" },
      { at: at("2026-10-03T09:00:00.000Z"), channel: "EMAIL" },
    ])
    expect(certRequestLabel(alContrario, OGGI)).toBe(
      "Chiesto il 03/10/2026 per email",
    )
  })

  it("chiesto oggi: lo dice, senza la data", () => {
    const s = summarizeCertRequests([
      { at: at("2026-10-06T08:00:00.000Z"), channel: "WHATSAPP" },
    ])
    expect(certRequestLabel(s, OGGI)).toBe("Chiesto oggi su WhatsApp")
  })

  it("«oggi» è il giorno di Roma: le 23:30 di ieri sera non sono oggi", () => {
    // 05/10 alle 23:30 di Roma = 21:30 UTC
    const s = summarizeCertRequests([
      { at: at("2026-10-05T21:30:00.000Z"), channel: "EMAIL" },
    ])
    expect(certRequestLabel(s, OGGI)).toBe("Chiesto il 05/10/2026 per email")
  })
})
