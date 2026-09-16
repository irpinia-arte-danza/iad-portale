import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  describeSchedule,
  describeScheduleAdmin,
  paymentFeeTypeLabel,
  scheduleCourseName,
  type ScheduleLine,
} from "./schedule-lines"

// Giorno di calendario come lo salva il DB (@db.Date): mezzanotte UTC
function dateOnly(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`)
}

function schedule(overrides: Partial<ScheduleLine> = {}): ScheduleLine {
  return {
    id: "s1",
    feeType: "MONTHLY",
    amountCents: 4500,
    dueDate: dateOnly("2026-09-10"),
    status: "DUE",
    notes: null,
    paymentId: null,
    athleteId: null,
    courseEnrollmentId: null,
    stageEnrollmentId: null,
    costumeAssignmentId: null,
    academicYear: { label: "2026-2027" },
    courseEnrollment: null,
    stageEnrollment: null,
    showcaseParticipation: null,
    costumeAssignment: null,
    ...overrides,
  } as ScheduleLine
}

function withCourse(name: string): Pick<ScheduleLine, "courseEnrollment"> {
  return { courseEnrollment: { athleteId: "a1", course: { name } } }
}

describe("describeSchedule — dicitura per la famiglia", () => {
  it("il contributo di iscrizione porta l'anno accademico", () => {
    expect(describeSchedule(schedule({ feeType: "ASSOCIATION" }))).toBe(
      "Contributo di iscrizione 2026/2027",
    )
  })

  // Le scadenze create prima del cambio di dicitura hanno ancora la vecchia
  // frase nelle note: non deve arrivare né in ricevuta né al genitore.
  it("ignora le note storiche della quota associativa", () => {
    const old = schedule({
      feeType: "ASSOCIATION",
      notes: "Quota associativa 2026/2027",
    })
    expect(describeSchedule(old)).toBe("Contributo di iscrizione 2026/2027")
  })

  it("la mensile ha mese e anno, senza il nome del corso", () => {
    const s = schedule({ ...withCourse("Danza Classica") })
    expect(describeSchedule(s)).toBe("Contributo mensile di settembre 2026")
  })

  it("due mensili dello stesso mese di anni diversi restano distinte", () => {
    const settembre2026 = schedule()
    const settembre2027 = schedule({ dueDate: dateOnly("2027-09-10") })
    expect(describeSchedule(settembre2026)).not.toBe(
      describeSchedule(settembre2027),
    )
  })

  it("la trimestrale non porta il corso", () => {
    const s = schedule({ feeType: "TRIMESTER", ...withCourse("Hip Hop") })
    expect(describeSchedule(s)).toBe("Contributo trimestrale")
  })

  it("stage, saggio e costume conservano la loro causale", () => {
    const stage = schedule({
      feeType: "STAGE",
      stageEnrollment: {
        athleteId: "a1",
        stage: { id: "st1", title: "Modern", date: dateOnly("2026-11-15") },
      },
    })
    expect(describeSchedule(stage)).toBe(
      "Iscrizione Stage «Modern» del 15/11/2026",
    )

    const saggio = schedule({
      feeType: "SHOWCASE_1",
      notes: "Saggio «Primavera» — Contributo unico",
    })
    expect(describeSchedule(saggio)).toBe("Saggio «Primavera» — Contributo unico")

    const costume = schedule({
      feeType: "COSTUME",
      notes: "Costume «Tutù rosa» — Maria Rossi",
    })
    expect(describeSchedule(costume)).toBe("Costume «Tutù rosa» — Maria Rossi")
  })

  it("nessuna dicitura per la famiglia contiene la parola «quota»", () => {
    const casi = [
      schedule({ feeType: "ASSOCIATION" }),
      schedule({ ...withCourse("Danza Classica") }),
      schedule({ feeType: "TRIMESTER" }),
      schedule({ feeType: "TRIAL_LESSON" }),
      schedule({ feeType: "OTHER" }),
    ]
    for (const s of casi) {
      expect(describeSchedule(s).toLowerCase()).not.toContain("quota")
    }
  })
})

describe("describeScheduleAdmin — dicitura per il gestionale", () => {
  it("aggiunge il corso alla dicitura della famiglia", () => {
    const s = schedule({ ...withCourse("Danza Classica") })
    expect(describeScheduleAdmin(s)).toBe(
      "Contributo mensile di settembre 2026 — Danza Classica",
    )
  })

  // Il caso che serve a Giuseppina: stessa allieva, stesso mese, due corsi
  it("distingue due rate dello stesso mese di corsi diversi", () => {
    const classica = schedule({ id: "s1", ...withCourse("Danza Classica") })
    const moderna = schedule({ id: "s2", ...withCourse("Danza Moderna") })
    expect(describeSchedule(classica)).toBe(describeSchedule(moderna))
    expect(describeScheduleAdmin(classica)).not.toBe(
      describeScheduleAdmin(moderna),
    )
  })

  it("senza corso coincide con la dicitura della famiglia", () => {
    const s = schedule({ feeType: "ASSOCIATION" })
    expect(describeScheduleAdmin(s)).toBe(describeSchedule(s))
    expect(scheduleCourseName(s)).toBeNull()
  })
})

describe("paymentFeeTypeLabel", () => {
  it("unisce le causali coperte da un pagamento su più scadenze", () => {
    const label = paymentFeeTypeLabel({
      feeType: "ASSOCIATION",
      amountCents: 7500,
      paymentSchedules: [
        { feeType: "MONTHLY", amountCents: 4500 },
        { feeType: "ASSOCIATION", amountCents: 3000 },
      ],
    })
    expect(label).toBe("Contributo di iscrizione + Contributo mensile")
  })
})

// ─────────────────────────────────────────────────────────────────────────
// Confine: il nome del corso non deve finire sui documenti della famiglia.
// describeScheduleAdmin vive solo nelle pagine /admin e negli audit.
// ─────────────────────────────────────────────────────────────────────────

const FAMILY_DIRS = [
  "src/lib/receipts",
  "src/lib/pdf",
  "src/app/(parent)",
  "src/app/ricevute",
]

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await sourceFiles(full)))
    } else if (/\.tsx?$/.test(entry.name) && !entry.name.includes(".test.")) {
      files.push(full)
    }
  }
  return files
}

describe("confine famiglia / gestionale", () => {
  it("ricevute, PDF e portale genitori non usano describeScheduleAdmin", async () => {
    const offenders: string[] = []
    for (const dir of FAMILY_DIRS) {
      for (const file of await sourceFiles(dir)) {
        const content = await readFile(file, "utf8")
        if (content.includes("describeScheduleAdmin")) offenders.push(file)
      }
    }
    expect(offenders).toEqual([])
  })
})
