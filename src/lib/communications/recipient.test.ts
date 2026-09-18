import { describe, expect, it } from "vitest"

import {
  resolveCommunicationRecipient,
  type RecipientAthlete,
  type RecipientParent,
} from "./recipient"

function parent(overrides: Partial<RecipientParent> = {}): RecipientParent {
  return {
    id: "p1",
    firstName: "Maria",
    lastName: "Rossi",
    email: "maria.rossi@example.it",
    receivesEmailCommunications: true,
    ...overrides,
  }
}

// Giorno di calendario, come le colonne @db.Date
function day(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`)
}

const OGGI = day("2026-09-18")
const MINORENNE = day("2015-03-12") // 11 anni
const MAGGIORENNE = day("2005-04-02") // 21 anni

function athlete(overrides: Partial<RecipientAthlete> = {}): RecipientAthlete {
  return {
    firstName: "Elena",
    lastName: "Rossi",
    email: null,
    dateOfBirth: MINORENNE,
    parentRelations: [{ parent: parent() }],
    ...overrides,
  }
}

describe("con un genitore collegato", () => {
  it("scrive al genitore", () => {
    const result = resolveCommunicationRecipient(athlete())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.recipient.email).toBe("maria.rossi@example.it")
    expect(result.recipient.parentId).toBe("p1")
    expect(result.recipient.isAthlete).toBe(false)
  })

  it("senza email del genitore non scrive", () => {
    const result = resolveCommunicationRecipient(
      athlete({ parentRelations: [{ parent: parent({ email: null }) }] }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe("NO_EMAIL")
  })

  // La garanzia che conta: una minorenne con un genitore senza email non
  // deve ricevere lei la comunicazione al posto del genitore
  it("non ripiega sull'allieva quando il genitore c'è ma è senza email", () => {
    const result = resolveCommunicationRecipient(
      athlete({
        email: "elena@example.it",
        parentRelations: [{ parent: parent({ email: null }) }],
      }),
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe("NO_EMAIL")
  })

  it("rispetta l'interruttore del genitore solo dove è richiesto", () => {
    const optedOut = athlete({
      parentRelations: [
        { parent: parent({ receivesEmailCommunications: false }) },
      ],
    })
    const withConsent = resolveCommunicationRecipient(optedOut, {
      requireCommunicationsConsent: true,
    })
    expect(withConsent.ok).toBe(false)
    if (!withConsent.ok) expect(withConsent.reason).toBe("OPTED_OUT")

    // I solleciti di pagamento non lo guardano: comportamento invariato
    expect(resolveCommunicationRecipient(optedOut).ok).toBe(true)
  })
})

describe("senza genitori collegati (corso adulti)", () => {
  it("scrive all'allieva maggiorenne che ha un'email propria", () => {
    const result = resolveCommunicationRecipient(
      athlete({
        firstName: "Simona",
        lastName: "Sica",
        email: "simona.sica@example.it",
        dateOfBirth: MAGGIORENNE,
        parentRelations: [],
      }),
      { at: OGGI },
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.recipient.email).toBe("simona.sica@example.it")
    expect(result.recipient.name).toBe("Simona Sica")
    // Nessun genitore da collegare al log dell'email
    expect(result.recipient.parentId).toBeNull()
    expect(result.recipient.isAthlete).toBe(true)
  })

  // Oggi in produzione è il caso delle tre adulte: la modifica non produce
  // effetti finché le email non vengono inserite in anagrafica
  it("senza email dell'allieva non scrive, e lo dice", () => {
    const result = resolveCommunicationRecipient(
      athlete({
        parentRelations: [],
        email: null,
        dateOfBirth: MAGGIORENNE,
      }),
      { at: OGGI },
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe("NO_CONTACT")
    expect(result.message).toContain("Nessun genitore collegato")
  })

  it("un'email di soli spazi non conta", () => {
    const result = resolveCommunicationRecipient(
      athlete({
        parentRelations: [],
        email: "   ",
        dateOfBirth: MAGGIORENNE,
      }),
      { at: OGGI },
    )
    expect(result.ok).toBe(false)
  })
})

describe("il limite dei 18 anni", () => {
  // Una minorenne senza genitori raggiungibili è un'anagrafica incompleta,
  // non una destinataria: le comunicazioni della scuola vanno a un adulto
  it("a una minorenne non si scrive, nemmeno se ha un'email propria", () => {
    const result = resolveCommunicationRecipient(
      athlete({
        email: "elena@example.it",
        dateOfBirth: MINORENNE,
        parentRelations: [],
      }),
      { at: OGGI },
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe("MINOR_NO_PARENT")
    expect(result.message).toContain("collega un genitore")
  })

  it("il giorno del diciottesimo compleanno si può scrivere", () => {
    const compieOggi = athlete({
      email: "elena@example.it",
      dateOfBirth: day("2008-09-18"),
      parentRelations: [],
    })
    expect(
      resolveCommunicationRecipient(compieOggi, { at: day("2026-09-17") }).ok,
    ).toBe(false)
    expect(
      resolveCommunicationRecipient(compieOggi, { at: OGGI }).ok,
    ).toBe(true)
  })

  // Il limite riguarda solo il ripiego: con un genitore collegato l'età
  // dell'allieva non c'entra nulla
  it("non tocca il caso normale con un genitore collegato", () => {
    expect(
      resolveCommunicationRecipient(athlete({ dateOfBirth: MINORENNE }), {
        at: OGGI,
      }).ok,
    ).toBe(true)
  })
})
