import { describe, expect, it } from "vitest"

import {
  certRequestTemplate,
  joinNames,
  planCertRequests,
  type CertRequestItem,
} from "./request-plan"

const item = (
  athleteId: string,
  status: CertRequestItem["status"],
  recipientKey: string,
): CertRequestItem => ({
  athleteId,
  athleteName: `Allieva ${athleteId}`,
  status,
  recipientKey,
})

describe("certRequestTemplate", () => {
  it("il mancante ha il suo testo", () => {
    expect(certRequestTemplate("missing")).toBe("certificato-mancante")
  })

  it("scaduto e in scadenza usano il promemoria con tipo e data", () => {
    expect(certRequestTemplate("expired")).toBe("cert-reminder")
    expect(certRequestTemplate("expiring")).toBe("cert-reminder")
  })

  it("con il certificato valido non c'è niente da chiedere", () => {
    expect(certRequestTemplate("valid")).toBeNull()
  })
})

describe("planCertRequests", () => {
  it("3 mancanti di 2 famiglie: 2 email, 2 famiglie", () => {
    const plan = planCertRequests([
      item("a", "missing", "parent:1"),
      item("b", "missing", "parent:1"),
      item("c", "missing", "parent:2"),
    ])
    expect(plan.families).toBe(2)
    expect(plan.emails).toHaveLength(2)
    expect(plan.emails[0].athleteIds).toEqual(["a", "b"])
    expect(plan.emails[1].athleteIds).toEqual(["c"])
  })

  it("scaduti e in scadenza restano uno per allieva: il testo parla di quel certificato", () => {
    const plan = planCertRequests([
      item("a", "expired", "parent:1"),
      item("b", "expiring", "parent:1"),
    ])
    expect(plan.emails).toHaveLength(2)
    expect(plan.families).toBe(1)
  })

  it("una famiglia con una mancante e una in scadenza riceve due testi diversi", () => {
    const plan = planCertRequests([
      item("a", "missing", "parent:1"),
      item("b", "expiring", "parent:1"),
    ])
    expect(plan.emails.map((e) => e.templateSlug)).toEqual([
      "certificato-mancante",
      "cert-reminder",
    ])
    expect(plan.families).toBe(1)
  })

  it("le allieve col certificato valido restano fuori, e si sa quali", () => {
    const plan = planCertRequests([
      item("a", "valid", "parent:1"),
      item("b", "missing", "parent:2"),
    ])
    expect(plan.nothingToAsk).toEqual(["a"])
    expect(plan.emails).toHaveLength(1)
  })

  it("ogni allieva con qualcosa da chiedere finisce in una email, una volta sola", () => {
    const items = [
      item("a", "missing", "parent:1"),
      item("b", "missing", "parent:1"),
      item("c", "expired", "parent:2"),
      item("d", "missing", "athlete:d"),
    ]
    const covered = planCertRequests(items).emails.flatMap((e) => e.athleteIds)
    expect(covered.sort()).toEqual(["a", "b", "c", "d"])
  })
})

describe("joinNames", () => {
  it("una, due, tre", () => {
    expect(joinNames(["Maria Rossi"])).toBe("Maria Rossi")
    expect(joinNames(["Maria Rossi", "Anna Rossi"])).toBe(
      "Maria Rossi e Anna Rossi",
    )
    expect(joinNames(["Maria Rossi", "Anna Rossi", "Lia Rossi"])).toBe(
      "Maria Rossi, Anna Rossi e Lia Rossi",
    )
  })
})
