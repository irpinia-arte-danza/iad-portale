import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  describeSchedule,
  describeScheduleAdmin,
  paymentFeeTypeLabel,
  paymentFeeTypeShortLabel,
  scheduleCourseName,
  scheduleReferenceCents,
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

function withCourse(
  name: string,
  monthlyFeeCents = 4000,
): Pick<ScheduleLine, "courseEnrollment"> {
  return {
    courseEnrollment: { athleteId: "a1", course: { name, monthlyFeeCents } },
  }
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
  const ISCRIZIONE_PIU_MENSILE = {
    feeType: "ASSOCIATION" as const,
    amountCents: 7500,
    paymentSchedules: [
      { feeType: "MONTHLY" as const, amountCents: 4500 },
      { feeType: "ASSOCIATION" as const, amountCents: 3000 },
    ],
  }

  it("unisce le causali coperte da un pagamento su più scadenze", () => {
    expect(paymentFeeTypeLabel(ISCRIZIONE_PIU_MENSILE)).toBe(
      "Contributo di iscrizione + Contributo mensile",
    )
  })

  it("la versione corta è quella che sta dentro un chip", () => {
    expect(paymentFeeTypeShortLabel(ISCRIZIONE_PIU_MENSILE)).toBe(
      "Iscrizione + mensile",
    )
  })

  it("un tipo solo: nessun «+», e la prima lettera resta maiuscola", () => {
    const solaMensile = {
      feeType: "MONTHLY" as const,
      amountCents: 4500,
      paymentSchedules: [{ feeType: "MONTHLY" as const, amountCents: 4500 }],
    }
    expect(paymentFeeTypeShortLabel(solaMensile)).toBe("Mensile")
    expect(paymentFeeTypeLabel(solaMensile)).toBe("Contributo mensile")
  })

  it("la versione corta è più corta: è l'unico motivo per cui esiste", () => {
    expect(
      paymentFeeTypeShortLabel(ISCRIZIONE_PIU_MENSILE).length,
    ).toBeLessThan(paymentFeeTypeLabel(ISCRIZIONE_PIU_MENSILE).length)
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

describe("scheduleReferenceCents — la quota a cui una scadenza può tornare", () => {
  it("per una mensile è la quota del corso", () => {
    expect(
      scheduleReferenceCents(
        schedule({ feeType: "MONTHLY", ...withCourse("Moderno 2h", 4000) }),
      ),
    ).toBe(4000)
  })

  it("per il contributo di iscrizione non esiste", () => {
    expect(scheduleReferenceCents(schedule({ feeType: "ASSOCIATION" }))).toBeNull()
  })

  it("per il trimestre non esiste: la quota del corso è mensile", () => {
    expect(
      scheduleReferenceCents(
        schedule({ feeType: "TRIMESTER", ...withCourse("Moderno 2h", 4000) }),
      ),
    ).toBeNull()
  })

  it("per stage, saggio e costume non esiste", () => {
    for (const feeType of ["STAGE", "SHOWCASE_1", "SHOWCASE_2", "COSTUME"] as const) {
      expect(scheduleReferenceCents(schedule({ feeType }))).toBeNull()
    }
  })

  it("mensile senza corso collegato: nessun riferimento invece di un errore", () => {
    expect(
      scheduleReferenceCents(schedule({ feeType: "MONTHLY", courseEnrollment: null })),
    ).toBeNull()
  })
})
