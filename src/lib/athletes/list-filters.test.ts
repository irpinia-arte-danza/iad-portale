import { describe, expect, it } from "vitest"

import {
  ATHLETE_LIST_FILTERS,
  athleteStepHref,
  parseAthleteListFilter,
  type AthleteListFilter,
  type AthleteListFilterStep,
} from "./list-filters"
import {
  athleteSetupChecklist,
  type ChecklistAthlete,
} from "./setup-checklist"

const YEAR = {
  id: "ay-2026",
  label: "2026/2027",
  startDate: new Date("2026-09-01T00:00:00.000Z"),
}
const PREVIOUS_YEAR_ID = "ay-2025"
const AT = new Date("2026-10-05T00:00:00.000Z")

function athlete(over: Partial<ChecklistAthlete> = {}): ChecklistAthlete {
  return {
    status: "ACTIVE",
    // Maggiorenne
    dateOfBirth: new Date("1990-05-10T00:00:00.000Z"),
    email: "adulta@example.com",
    linkedParents: 1,
    enrollments: [
      { academicYearId: YEAR.id, withdrawalDate: null, deletedAt: null },
    ],
    certificates: [
      {
        expiryDate: new Date("2027-06-30T00:00:00.000Z"),
        createdAt: new Date("2026-09-10T00:00:00.000Z"),
      },
    ],
    cards: [
      {
        entity: "ENDAS",
        cardYear: 2026,
        expiryDate: new Date("2027-09-13T00:00:00.000Z"),
        createdAt: new Date("2026-09-14T00:00:00.000Z"),
      },
    ],
    ...over,
  }
}

// La popolazione: una per ogni passo filtrabile, più i casi che non devono
// contare.
const POPULATION: { name: string; athlete: ChecklistAthlete }[] = [
  { name: "a posto", athlete: athlete() },
  {
    name: "minorenne senza genitore",
    athlete: athlete({
      dateOfBirth: new Date("2015-03-02T00:00:00.000Z"),
      linkedParents: 0,
      email: null,
    }),
  },
  {
    name: "maggiorenne senza email",
    athlete: athlete({ linkedParents: 0, email: null }),
  },
  {
    name: "maggiorenne senza email, con l'email in bianco",
    athlete: athlete({ linkedParents: 0, email: "   " }),
  },
  {
    name: "iscritta solo l'anno scorso",
    athlete: athlete({
      enrollments: [
        {
          academicYearId: PREVIOUS_YEAR_ID,
          withdrawalDate: null,
          deletedAt: null,
        },
      ],
    }),
  },
  {
    name: "iscrizione annullata quest'anno (nel Cestino)",
    athlete: athlete({
      enrollments: [
        {
          academicYearId: YEAR.id,
          withdrawalDate: null,
          deletedAt: new Date("2026-09-20T00:00:00.000Z"),
        },
      ],
    }),
  },
  {
    // Ha smesso: non ha niente da completare, nemmeno il genitore
    name: "ritirata senza genitore né corso",
    athlete: athlete({
      status: "WITHDRAWN",
      dateOfBirth: new Date("2015-03-02T00:00:00.000Z"),
      linkedParents: 0,
      email: null,
      enrollments: [],
      certificates: [],
      cards: [],
    }),
  },
]

function steps(a: ChecklistAthlete): AthleteListFilterStep[] {
  return athleteSetupChecklist(a, {
    currentAcademicYear: YEAR,
    at: AT,
  })
    .map((s) => s.id)
    .filter((id): id is AthleteListFilterStep => id in countsByStep())
}

function countsByStep(): Record<AthleteListFilterStep, number> {
  return { guardian: 0, email: 0, course: 0 }
}

describe("filtri dell'elenco allieve", () => {
  it("il conteggio del riquadro e le righe dell'elenco vengono dallo stesso passo", () => {
    // Il riquadro conta, la lista filtra: due letture della stessa funzione
    const counts = countsByStep()
    for (const { athlete: a } of POPULATION) {
      for (const step of steps(a)) counts[step] += 1
    }

    for (const step of Object.keys(counts) as AthleteListFilterStep[]) {
      const rows = POPULATION.filter((p) => steps(p.athlete).includes(step))
      expect(rows.length, step).toBe(counts[step])
    }

    expect(counts).toEqual({ guardian: 1, email: 2, course: 2 })
  })

  it("la ritirata non compare in nessun filtro", () => {
    const withdrawn = POPULATION.find((p) => p.athlete.status === "WITHDRAWN")!
    expect(steps(withdrawn.athlete)).toEqual([])
  })

  it("una minorenne senza genitore conta nel suo filtro, non in «senza email»", () => {
    const minor = POPULATION.find(
      (p) => p.name === "minorenne senza genitore",
    )!
    expect(steps(minor.athlete)).toEqual(["guardian"])
  })

  it("l'href del riquadro è un filtro che l'elenco riconosce", () => {
    for (const step of Object.keys(countsByStep()) as AthleteListFilterStep[]) {
      const href = athleteStepHref(step)
      const value = href.split("filtro=")[1]
      const parsed = parseAthleteListFilter(value)
      expect(parsed, href).not.toBeNull()
      expect(ATHLETE_LIST_FILTERS[parsed as AthleteListFilter]).toBe(step)
    }
  })

  it("un filtro inventato nell'URL viene ignorato", () => {
    expect(parseAthleteListFilter("senza-niente")).toBeNull()
    expect(parseAthleteListFilter(undefined)).toBeNull()
    expect(parseAthleteListFilter("")).toBeNull()
  })
})
