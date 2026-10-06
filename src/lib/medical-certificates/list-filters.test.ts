import { describe, expect, it } from "vitest"

import type { CertStatus } from "./certificate-status"
import {
  CERT_FILTER_ORDER,
  certFilterCounts,
  defaultCertFilter,
  matchesCertFilter,
  parseCertListFilter,
} from "./list-filters"

// Una per stato (la ritirata non arriva fin qui: la esclude la query)
const STATI: CertStatus[] = ["missing", "missing", "expired", "expiring", "valid"]

describe("filtri dell'elenco certificati", () => {
  it("ogni chip conta le righe che apre", () => {
    const counts = certFilterCounts(STATI)
    for (const filter of CERT_FILTER_ORDER) {
      const rows = STATI.filter((s) => matchesCertFilter(s, filter))
      expect(rows.length, filter).toBe(counts[filter])
    }
    expect(counts).toEqual({
      missing: 2,
      expired: 1,
      expiring: 1,
      valid: 1,
      all: 5,
    })
  })

  it("il badge del menu (mancanti + scaduti) è la somma dei primi due chip", () => {
    const counts = certFilterCounts(STATI)
    const menu = STATI.filter((s) => s === "missing" || s === "expired").length
    expect(counts.missing + counts.expired).toBe(menu)
  })

  it("si apre sul primo chip non vuoto", () => {
    expect(defaultCertFilter(certFilterCounts(STATI))).toBe("missing")
    expect(defaultCertFilter(certFilterCounts(["expired", "valid"]))).toBe(
      "expired",
    )
    expect(defaultCertFilter(certFilterCounts(["expiring"]))).toBe("expiring")
    expect(defaultCertFilter(certFilterCounts(["valid"]))).toBe("valid")
  })

  it("senza allieve si apre su «Tutte»", () => {
    expect(defaultCertFilter(certFilterCounts([]))).toBe("all")
  })

  it("i valori dei riquadri della dashboard restano validi", () => {
    for (const value of ["missing", "expired", "expiring"]) {
      expect(parseCertListFilter(value), value).toBe(value)
    }
  })

  it("un valore inventato non è un filtro", () => {
    expect(parseCertListFilter("rotto")).toBeNull()
    expect(parseCertListFilter(undefined)).toBeNull()
  })
})
