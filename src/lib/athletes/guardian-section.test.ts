import { describe, expect, it } from "vitest"

import { guardianSection } from "./guardian-section"

// 5 ottobre 2026, il giorno in cui si guarda la scheda
const AT = new Date("2026-10-05T00:00:00.000Z")
const born = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

describe("sezione Genitori e tutori", () => {
  it("minorenne senza genitori: invito in evidenza, come prima", () => {
    const section = guardianSection({
      dateOfBirth: born("2015-03-02"),
      linkedParents: 0,
      at: AT,
    })

    expect(section.kind).toBe("MINOR")
    expect(section.empty).toEqual({
      style: "call-to-action",
      title: "Nessun genitore collegato",
      hint: "Collega almeno un genitore o tutore per gestire contatti e pagamenti.",
    })
    expect(section.addButton.variant).toBe("default")
    expect(section.recipientNote).toBeNull()
    expect(section.accessWarning).toBeNull()
  })

  it("minorenne con un genitore: elenco e nessuna riga sui destinatari", () => {
    const section = guardianSection({
      dateOfBirth: born("2015-03-02"),
      linkedParents: 1,
      at: AT,
    })

    expect(section.kind).toBe("MINOR")
    expect(section.empty).toBeNull()
    expect(section.recipientNote).toBeNull()
    expect(section.addButton.variant).toBe("default")
  })

  it("maggiorenne senza genitori: nessun invito in evidenza, tasto secondario", () => {
    const section = guardianSection({
      dateOfBirth: born("1990-05-10"),
      linkedParents: 0,
      at: AT,
    })

    expect(section.kind).toBe("ADULT_NO_GUARDIAN")
    expect(section.empty).toEqual({
      style: "note",
      text: "È maggiorenne: comunicazioni e ricevute vanno a lei. Collega un genitore solo se è lui o lei a pagare.",
    })
    expect(section.addButton).toEqual({
      label: "Collega un genitore",
      variant: "outline",
    })
    expect(section.accessWarning).toBeNull()
  })

  it("maggiorenne con un genitore: dice che comunicazioni e ricevute vanno a lui", () => {
    const section = guardianSection({
      dateOfBirth: born("1990-05-10"),
      linkedParents: 1,
      at: AT,
    })

    expect(section.kind).toBe("ADULT_WITH_GUARDIAN")
    expect(section.empty).toBeNull()
    expect(section.recipientNote).toContain("vanno al genitore collegato")
    // La regola vera: chi paga per i solleciti, il contatto per il certificato
    expect(section.recipientNote).toContain("chi paga i contributi")
    expect(section.recipientNote).toContain("contatto principale")
    expect(section.addButton.variant).toBe("outline")
  })

  it("compie 18 anni oggi: è maggiorenne", () => {
    const section = guardianSection({
      dateOfBirth: born("2008-10-05"),
      linkedParents: 0,
      at: AT,
    })

    expect(section.kind).toBe("ADULT_NO_GUARDIAN")
  })

  it("compie 18 anni domani: è ancora minorenne", () => {
    const section = guardianSection({
      dateOfBirth: born("2008-10-06"),
      linkedParents: 0,
      at: AT,
    })

    expect(section.kind).toBe("MINOR")
    expect(section.empty?.style).toBe("call-to-action")
  })

  it("maggiorenne con accesso proprio: il dialog avvisa prima di collegare", () => {
    const section = guardianSection({
      dateOfBirth: born("1990-05-10"),
      linkedParents: 0,
      hasOwnAccess: true,
      at: AT,
    })

    expect(section.accessWarning).not.toBeNull()
    // Deve dire le tre cose vere: l'accesso regge, i destinatari cambiano,
    // da qui non si gestisce più
    expect(section.accessWarning).toContain("continua a funzionare")
    expect(section.accessWarning).toContain("passano al genitore")
    expect(section.accessWarning).toContain("scollegare il genitore")
  })

  it("maggiorenne con accesso proprio e un genitore già collegato: lo dice nella sezione", () => {
    const section = guardianSection({
      dateOfBirth: born("1990-05-10"),
      linkedParents: 1,
      hasOwnAccess: true,
      at: AT,
    })

    expect(section.ownAccessNote).toContain("continua a funzionare")
    // L'avviso serve prima di collegare il primo genitore, non dopo
    expect(section.accessWarning).toBeNull()
  })

  it("una minorenne non ha accesso proprio: nessun avviso nemmeno per sbaglio", () => {
    const section = guardianSection({
      dateOfBirth: born("2015-03-02"),
      linkedParents: 0,
      hasOwnAccess: true,
      at: AT,
    })

    expect(section.accessWarning).toBeNull()
    expect(section.ownAccessNote).toBeNull()
  })
})
