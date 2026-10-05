import { describe, expect, it } from "vitest"

import {
  athleteSetupChecklist,
  type ChecklistAthlete,
  type ChecklistContext,
} from "./setup-checklist"

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const OGGI = d("2026-10-05")

// Anno accademico 2026/2027: anno sociale ENDAS 2026
const ANNO: ChecklistContext = {
  currentAcademicYear: {
    id: "ay-2026",
    label: "2026-2027",
    startDate: d("2026-09-01"),
  },
  at: OGGI,
}

// Allieva a posto: tutto presente, nessun passo
function completa(overrides: Partial<ChecklistAthlete> = {}): ChecklistAthlete {
  return {
    status: "ACTIVE",
    dateOfBirth: d("2014-03-01"),
    email: null,
    linkedParents: 1,
    enrollments: [
      { academicYearId: "ay-2026", withdrawalDate: null, deletedAt: null },
    ],
    certificates: [{ expiryDate: d("2027-06-30"), createdAt: d("2026-09-16") }],
    cards: [
      {
        entity: "ENDAS",
        cardYear: 2026,
        expiryDate: d("2027-09-13"),
        createdAt: d("2026-09-16"),
      },
    ],
    ...overrides,
  }
}

const ids = (a: ChecklistAthlete, c: ChecklistContext = ANNO) =>
  athleteSetupChecklist(a, c).map((s) => s.id)

describe("athleteSetupChecklist", () => {
  it("allieva completa: nessun passo", () => {
    expect(ids(completa())).toEqual([])
  })

  it("minorenne senza genitore → Genitore", () => {
    expect(ids(completa({ linkedParents: 0 }))).toEqual(["guardian"])
  })

  it("il motivo del passo Genitore dice cosa non arriva alla famiglia", () => {
    const [step] = athleteSetupChecklist(completa({ linkedParents: 0 }), ANNO)
    expect(step.reason).toContain("solleciti")
    expect(step.reason).toContain("ricevute")
  })

  it("maggiorenne senza genitori e senza email → Email", () => {
    expect(
      ids(completa({ dateOfBirth: d("2000-01-01"), linkedParents: 0 })),
    ).toEqual(["email"])
  })

  it("maggiorenne con email → nessun passo Email", () => {
    expect(
      ids(
        completa({
          dateOfBirth: d("2000-01-01"),
          linkedParents: 0,
          email: "allieva@example.it",
        }),
      ),
    ).toEqual([])
  })

  it("email di soli spazi conta come mancante", () => {
    expect(
      ids(completa({ dateOfBirth: d("2000-01-01"), linkedParents: 0, email: "   " })),
    ).toEqual(["email"])
  })

  it("compie 18 anni oggi, senza genitori né email → Email, non Genitore", () => {
    expect(
      ids(completa({ dateOfBirth: d("2008-10-05"), linkedParents: 0 })),
    ).toEqual(["email"])
  })

  it("il giorno prima dei 18 è ancora Genitore", () => {
    expect(
      ids(completa({ dateOfBirth: d("2008-10-06"), linkedParents: 0 })),
    ).toEqual(["guardian"])
  })

  it("maggiorenne CON genitori collegati e senza email: nessun passo", () => {
    expect(
      ids(completa({ dateOfBirth: d("2000-01-01"), linkedParents: 1 })),
    ).toEqual([])
  })

  it("iscrizione solo nell'anno precedente → Corso", () => {
    expect(
      ids(
        completa({
          enrollments: [
            { academicYearId: "ay-2025", withdrawalDate: null, deletedAt: null },
          ],
        }),
      ),
    ).toEqual(["course"])
  })

  it("iscrizione ritirata nell'anno corrente → nessun passo Corso", () => {
    expect(
      ids(
        completa({
          enrollments: [
            {
              academicYearId: "ay-2026",
              withdrawalDate: d("2026-10-01"),
              deletedAt: null,
            },
          ],
        }),
      ),
    ).toEqual([])
  })

  it("iscrizione annullata nell'anno corrente → Corso", () => {
    expect(
      ids(
        completa({
          enrollments: [
            {
              academicYearId: "ay-2026",
              withdrawalDate: null,
              deletedAt: d("2026-09-20"),
            },
          ],
        }),
      ),
    ).toEqual(["course"])
  })

  it("nessuna iscrizione → Corso", () => {
    expect(ids(completa({ enrollments: [] }))).toEqual(["course"])
  })

  it("certificato scaduto → Certificato", () => {
    expect(
      ids(
        completa({
          certificates: [
            { expiryDate: d("2026-09-30"), createdAt: d("2025-09-16") },
          ],
        }),
      ),
    ).toEqual(["certificate"])
  })

  it("certificato in scadenza → nessun passo Certificato", () => {
    // Scade fra 10 giorni: "in scadenza", non mancante
    expect(
      ids(
        completa({
          certificates: [
            { expiryDate: d("2026-10-15"), createdAt: d("2025-09-16") },
          ],
        }),
      ),
    ).toEqual([])
  })

  it("nessun certificato → Certificato, e il motivo lo dice", () => {
    const steps = athleteSetupChecklist(completa({ certificates: [] }), ANNO)
    expect(steps.map((s) => s.id)).toEqual(["certificate"])
    expect(steps[0].reason).toContain("Non ne ha uno")
  })

  it("conta il certificato con la scadenza più lontana, non il primo in elenco", () => {
    expect(
      ids(
        completa({
          certificates: [
            { expiryDate: d("2026-09-01"), createdAt: d("2025-09-01") },
            { expiryDate: d("2027-06-30"), createdAt: d("2026-09-16") },
          ],
        }),
      ),
    ).toEqual([])
  })

  it("tessera dell'anno sociale precedente → Tessera", () => {
    expect(
      ids(
        completa({
          cards: [
            {
              entity: "ENDAS",
              cardYear: 2025,
              expiryDate: d("2026-09-13"),
              createdAt: d("2025-09-16"),
            },
          ],
        }),
      ),
    ).toEqual(["card"])
  })

  it("nessuna tessera → Tessera, e il motivo rimanda all'elenco per il referente", () => {
    const steps = athleteSetupChecklist(completa({ cards: [] }), ANNO)
    expect(steps.map((s) => s.id)).toEqual(["card"])
    expect(steps[0].reason).toContain("referente")
    expect(steps[0].reason).toContain("2026")
  })

  it("una tessera CSEN non copre il tesseramento ENDAS", () => {
    expect(
      ids(
        completa({
          cards: [
            {
              entity: "CSEN",
              cardYear: 2026,
              expiryDate: d("2027-09-13"),
              createdAt: d("2026-09-16"),
            },
          ],
        }),
      ),
    ).toEqual(["card"])
  })

  it("allieva WITHDRAWN → lista vuota anche se manca tutto", () => {
    expect(
      ids(
        completa({
          status: "WITHDRAWN",
          linkedParents: 0,
          enrollments: [],
          certificates: [],
          cards: [],
        }),
      ),
    ).toEqual([])
  })

  it("TRIAL è trattata come ACTIVE: i passi si mostrano", () => {
    expect(
      ids(completa({ status: "TRIAL", enrollments: [], certificates: [] })),
    ).toEqual(["course", "certificate"])
  })

  it("senza anno accademico corrente, Corso e Tessera non compaiono", () => {
    expect(
      ids(completa({ enrollments: [], cards: [] }), {
        currentAcademicYear: null,
        at: OGGI,
      }),
    ).toEqual([])
  })

  it("ordine fisso: genitore, corso, certificato, tessera", () => {
    expect(
      ids(
        completa({
          linkedParents: 0,
          enrollments: [],
          certificates: [],
          cards: [],
        }),
      ),
    ).toEqual(["guardian", "course", "certificate", "card"])
  })
})
