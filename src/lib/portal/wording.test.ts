import { describe, expect, it } from "vitest"

import { portalWording } from "./wording"

const perGenitore = portalWording({ kind: "parent", parentId: "p1" })
const perAllieva = portalWording({ kind: "athlete", athleteId: "a1" })

describe("le parole dell'area riservata", () => {
  // Il punto di tutto il lavoro: a un'allieva maggiorenne che paga per sé
  // non si dice "le tue figlie"
  it("a un'allieva non si parla mai di figlie", () => {
    for (const [campo, testo] of Object.entries(perAllieva)) {
      expect(
        testo.toLowerCase(),
        `il campo ${campo} parla di figlie`,
      ).not.toContain("figli")
    }
  })

  it("a un genitore si continua a parlare delle figlie", () => {
    expect(perGenitore.peopleSectionTitle).toContain("figlie")
    expect(perGenitore.stageEnrollButton).toContain("figlie")
  })

  it("il tasto di iscrizione allo stage cambia soggetto", () => {
    expect(perAllieva.stageEnrollButton).toBe("Iscrivimi")
    expect(perGenitore.stageEnrollButton).toBe("Iscrivi le mie figlie")
  })

  // Nessuna stringa vuota per sbaglio: l'unica ammessa è il ripiego del
  // saluto, che per l'allieva non serve perché il nome c'è sempre
  it("nessun testo dimenticato", () => {
    for (const [campo, testo] of Object.entries(perGenitore)) {
      expect(testo.length, `${campo} è vuoto`).toBeGreaterThan(0)
    }
    for (const [campo, testo] of Object.entries(perAllieva)) {
      if (campo === "greetingFallback") continue
      expect(testo.length, `${campo} è vuoto`).toBeGreaterThan(0)
    }
  })
})
