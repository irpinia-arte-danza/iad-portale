import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { isMinorAt } from "@/lib/utils/age"

import type { PortalScope } from "./portal-scope"
import {
  canSeePersonalData,
  canSeeReceipt,
  minorBornAfter,
  personalDataScopeWhere,
} from "./portal-visibility"

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`)
const OGGI = d("2026-10-06")

const genitoreA: PortalScope = { kind: "parent", parentId: "parent-a" }
const genitoreB: PortalScope = { kind: "parent", parentId: "parent-b" }
const allieva: PortalScope = { kind: "athlete", athleteId: "athlete-1" }

const minorenne = { dateOfBirth: d("2012-03-15") }
const maggiorenne = { dateOfBirth: d("2004-03-15") }
// Compie 18 anni oggi
const diciottenneOggi = { dateOfBirth: d("2008-10-06") }

describe("canSeePersonalData", () => {
  it("il genitore vede i dati personali della figlia minorenne", () => {
    expect(canSeePersonalData(genitoreA, minorenne, OGGI)).toBe(true)
  })

  it("della figlia maggiorenne il genitore non vede più i dati personali", () => {
    expect(canSeePersonalData(genitoreA, maggiorenne, OGGI)).toBe(false)
    expect(canSeePersonalData(genitoreA, diciottenneOggi, OGGI)).toBe(false)
  })

  it("l'allieva con accesso proprio vede tutto di sé", () => {
    expect(canSeePersonalData(allieva, maggiorenne, OGGI)).toBe(true)
  })
})

describe("personalDataScopeWhere", () => {
  it("per un genitore aggiunge il filtro sulla minore età", () => {
    expect(personalDataScopeWhere(genitoreA, OGGI)).toEqual({
      parentRelations: { some: { parentId: "parent-a" } },
      dateOfBirth: { gt: d("2008-10-06") },
    })
  })

  it("per un'allieva è il solo ambito", () => {
    expect(personalDataScopeWhere(allieva, OGGI)).toEqual({ id: "athlete-1" })
  })

  // Il filtro e isMinorAt devono dire la stessa cosa, giorno per giorno:
  // nata il 29 febbraio compresa
  it("minorBornAfter coincide con isMinorAt", () => {
    const giorni = [
      d("2026-02-27"),
      d("2026-02-28"),
      d("2026-03-01"),
      d("2026-03-02"),
      d("2026-10-05"),
      d("2026-10-06"),
      d("2026-10-07"),
    ]
    const nascite = [
      d("2008-02-28"),
      d("2008-02-29"),
      d("2008-03-01"),
      d("2008-10-05"),
      d("2008-10-06"),
      d("2008-10-07"),
    ]
    for (const at of giorni) {
      const cutoff = minorBornAfter(at)
      for (const dob of nascite) {
        expect(
          dob.getTime() > cutoff.getTime(),
          `${dob.toISOString()} il ${at.toISOString()}`,
        ).toBe(isMinorAt(dob, at))
      }
    }
  })
})

describe("canSeeReceipt", () => {
  it("il genitore vede solo le ricevute intestate a lui", () => {
    expect(canSeeReceipt(genitoreA, { payerId: "parent-a" })).toBe(true)
    expect(canSeeReceipt(genitoreB, { payerId: "parent-a" })).toBe(false)
    // Intestata all'allieva stessa (payerId nullo): non al genitore
    expect(canSeeReceipt(genitoreA, { payerId: null })).toBe(false)
  })

  it("l'allieva vede tutte le ricevute che la riguardano", () => {
    expect(canSeeReceipt(allieva, { payerId: "parent-a" })).toBe(true)
    expect(canSeeReceipt(allieva, { payerId: null })).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────
// Area famiglie: le due regole che devono reggere a schermo.
// ─────────────────────────────────────────────────────────────────────────

describe("il genitore di una maggiorenne non riceve i suoi dati personali", () => {
  const ventenne = { dateOfBirth: d("2006-04-20") }
  const dodicenne = { dateOfBirth: d("2014-04-20") }

  it("il filtro del genitore lascia passare la dodicenne e ferma la ventenne", () => {
    const where = personalDataScopeWhere(genitoreA, OGGI)
    const cutoff = (where.dateOfBirth as { gt: Date }).gt
    // La ventenne è nata PRIMA del taglio: esclusa. La dodicenne dopo: inclusa.
    expect(ventenne.dateOfBirth.getTime() > cutoff.getTime()).toBe(false)
    expect(dodicenne.dateOfBirth.getTime() > cutoff.getTime()).toBe(true)
    // E il taglio è coerente con la decisione per record
    expect(canSeePersonalData(genitoreA, ventenne, OGGI)).toBe(false)
    expect(canSeePersonalData(genitoreA, dodicenne, OGGI)).toBe(true)
  })

  it("il filtro tiene l'ambito del genitore: niente figlie altrui", () => {
    const where = personalDataScopeWhere(genitoreA, OGGI)
    expect(where.parentRelations).toEqual({ some: { parentId: "parent-a" } })
  })
})

describe("due genitori della stessa allieva", () => {
  const ricevutaDiA = { payerId: "parent-a" }
  const ricevutaDiB = { payerId: "parent-b" }

  it("A vede le sue ricevute, non quelle di B; B il contrario", () => {
    expect(canSeeReceipt(genitoreA, ricevutaDiA)).toBe(true)
    expect(canSeeReceipt(genitoreA, ricevutaDiB)).toBe(false)
    expect(canSeeReceipt(genitoreB, ricevutaDiB)).toBe(true)
    expect(canSeeReceipt(genitoreB, ricevutaDiA)).toBe(false)
  })

  it("una ricevuta senza intestatario non la vede nessun genitore", () => {
    expect(canSeeReceipt(genitoreA, { payerId: null })).toBe(false)
    expect(canSeeReceipt(genitoreB, { payerId: null })).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────
// Le query dell'area genitori devono passare da queste regole. Si legge il
// sorgente: ogni funzione che interroga tessere, presenze, certificati o
// orari personali con un ambito di allieve deve usare personalDataScopeWhere
// (non il solo athleteScopeWhere); chi legge i pagamenti deve decidere le
// ricevute con canSeeReceipt. Si cercano i nomi delle funzioni e dei
// modelli, non le righe, così il refactor del file non rompe il test.
// ─────────────────────────────────────────────────────────────────────────

const QUERIES_PATH = fileURLToPath(
  new URL("../../app/(parent)/parent/_actions/queries.ts", import.meta.url),
)

type ExportedFn = { name: string; body: string }

function exportedFunctions(source: string): ExportedFn[] {
  const out: ExportedFn[] = []
  const re = /^export (?:async )?function (\w+)/gm
  const matches = [...source.matchAll(re)]
  matches.forEach((m, i) => {
    const start = m.index ?? 0
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? source.length) : source.length
    out.push({ name: m[1], body: source.slice(start, end) })
  })
  return out
}

describe("le query dell'area genitori rispettano le regole", () => {
  const source = readFileSync(QUERIES_PATH, "utf8")
  const fns = exportedFunctions(source)

  it("il file delle query esiste ed esporta funzioni", () => {
    expect(fns.length).toBeGreaterThan(0)
  })

  const PERSONAL_MODELS = [
    "prisma.affiliation",
    "prisma.attendance",
    "prisma.medicalCertificate",
    "prisma.courseSchedule",
  ]

  it("tessere, presenze, certificati e orari personali passano da personalDataScopeWhere", () => {
    const offenders = fns
      .filter((f) => PERSONAL_MODELS.some((m) => f.body.includes(m)))
      // Solo le query con un ambito di allieve: l'orario generale della
      // scuola non ne ha e vale per tutti
      .filter((f) => f.body.includes("athleteScopeWhere(") || f.body.includes("ScopeWhere(scope"))
      .filter((f) => !f.body.includes("personalDataScopeWhere("))
      .map((f) => f.name)
    expect(
      offenders,
      `funzioni che leggono dati personali con il solo ambito di allieve: ${offenders.join(", ")}`,
    ).toEqual([])
  })

  it("chi legge i pagamenti decide le ricevute con canSeeReceipt", () => {
    const paymentReaders = fns.filter((f) => f.body.includes("prisma.payment.findMany"))
    expect(paymentReaders.length, "nessuna funzione legge i pagamenti: il file è cambiato?").toBeGreaterThan(0)
    const offenders = paymentReaders
      .filter((f) => f.body.includes("receipt"))
      .filter((f) => !f.body.includes("canSeeReceipt("))
      .map((f) => f.name)
    expect(offenders, `espongono ricevute senza canSeeReceipt: ${offenders.join(", ")}`).toEqual([])
  })

  it("le query sulle allieve non dimenticano l'ambito", () => {
    const offenders = fns
      .filter((f) => /prisma\.(athlete|affiliation|attendance|medicalCertificate|payment|paymentSchedule)\.(findMany|findFirst|groupBy|count)/.test(f.body))
      .filter((f) => !/ScopeWhere\(scope/.test(f.body))
      .map((f) => f.name)
    expect(offenders, `query senza ambito: ${offenders.join(", ")}`).toEqual([])
  })
})
