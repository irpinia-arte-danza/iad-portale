import { describe, expect, it } from "vitest"

import {
  areAllPaymentsTraceable,
  isTraceablePaymentMethod,
  receiptPaymentNotice,
} from "./traceability"

describe("isTraceablePaymentMethod", () => {
  it("contanti non tracciabili", () => {
    expect(isTraceablePaymentMethod("CASH")).toBe(false)
  })

  it("bonifico, POS e link SumUp tracciabili", () => {
    expect(isTraceablePaymentMethod("TRANSFER")).toBe(true)
    expect(isTraceablePaymentMethod("POS")).toBe(true)
    expect(isTraceablePaymentMethod("SUMUP_LINK")).toBe(true)
  })

  it("'Altro' non si dichiara tracciabile", () => {
    expect(isTraceablePaymentMethod("OTHER")).toBe(false)
  })
})

describe("areAllPaymentsTraceable (ricevuta cumulativa)", () => {
  it("singolo pagamento: segue il metodo", () => {
    expect(areAllPaymentsTraceable(["TRANSFER"])).toBe(true)
    expect(areAllPaymentsTraceable(["CASH"])).toBe(false)
  })

  it("tutti tracciabili: vale", () => {
    expect(areAllPaymentsTraceable(["TRANSFER", "POS", "SUMUP_LINK"])).toBe(true)
  })

  it("basta un contante per perdere la dicitura sull'intero importo", () => {
    expect(areAllPaymentsTraceable(["TRANSFER", "CASH"])).toBe(false)
    expect(areAllPaymentsTraceable(["CASH", "POS", "TRANSFER"])).toBe(false)
  })

  it("un metodo 'Altro' fa perdere la dicitura", () => {
    expect(areAllPaymentsTraceable(["POS", "OTHER"])).toBe(false)
  })

  it("nessun pagamento: niente dicitura", () => {
    expect(areAllPaymentsTraceable([])).toBe(false)
  })
})

describe("receiptPaymentNotice", () => {
  it("tutti tracciabili → dicitura di detraibilità", () => {
    expect(receiptPaymentNotice(["TRANSFER"])).toEqual({ kind: "TAX_DEDUCTION" })
    expect(receiptPaymentNotice(["POS", "TRANSFER"])).toEqual({
      kind: "TAX_DEDUCTION",
    })
  })

  it("contanti → riga neutra con il metodo", () => {
    expect(receiptPaymentNotice(["CASH"])).toEqual({
      kind: "PAYMENT_METHOD",
      methods: ["CASH"],
    })
  })

  it("metodi misti → riga neutra con i metodi, senza duplicati", () => {
    expect(receiptPaymentNotice(["TRANSFER", "CASH", "TRANSFER"])).toEqual({
      kind: "PAYMENT_METHOD",
      methods: ["TRANSFER", "CASH"],
    })
  })
})
