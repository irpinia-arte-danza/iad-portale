import { describe, expect, it } from "vitest"

import {
  attachmentTooLarge,
  canSendReceiptEmail,
  NEVER_SENT,
  receiptEmailBlockKind,
  receiptEmailBlocker,
  sendButtonLabel,
  wasSent,
  type ReceiptForEmail,
} from "./receipt-email"

function receipt(overrides: Partial<ReceiptForEmail> = {}): ReceiptForEmail {
  return {
    status: "VALID",
    payerName: "Maria Rossi",
    payerEmail: "maria.rossi@example.it",
    ...overrides,
  }
}

describe("chi si può mandare per email", () => {
  it("una ricevuta valida con email del pagante si manda", () => {
    expect(canSendReceiptEmail(receipt())).toBe(true)
    expect(receiptEmailBlocker(receipt())).toBeNull()
  })

  it("una ricevuta annullata è bloccata", () => {
    const cancelled = receipt({ status: "CANCELLED" })
    expect(receiptEmailBlockKind(cancelled)).toBe("CANCELLED")
    expect(canSendReceiptEmail(cancelled)).toBe(false)
    expect(receiptEmailBlocker(cancelled)).toContain("annullata")
  })

  // La 297 in produzione: pagante l'allieva stessa, nessun indirizzo congelato
  it("senza email del pagante è bloccata, con il motivo", () => {
    const orphan = receipt({ payerEmail: null })
    expect(receiptEmailBlockKind(orphan)).toBe("NO_EMAIL")
    expect(receiptEmailBlocker(orphan)).toContain("consegnata a mano")
  })

  it("una email di soli spazi non conta come indirizzo", () => {
    expect(canSendReceiptEmail(receipt({ payerEmail: "   " }))).toBe(false)
  })

  // L'annullamento viene prima: una ricevuta annullata resta bloccata anche
  // se il pagante ha un indirizzo
  it("l'annullamento prevale sul resto", () => {
    expect(
      receiptEmailBlockKind(receipt({ status: "CANCELLED", payerEmail: null })),
    ).toBe("CANCELLED")
  })
})

describe("stato dell'invio", () => {
  it("non inviata finché non c'è un invio riuscito", () => {
    expect(wasSent(NEVER_SENT)).toBe(false)
    expect(sendButtonLabel(NEVER_SENT)).toBe("Invia per email")
  })

  it("dopo un invio il tasto dice che si sta rimandando", () => {
    const sent = {
      lastSentAt: new Date("2026-09-20T10:00:00.000Z"),
      lastRecipient: "maria.rossi@example.it",
      sendCount: 1,
    }
    expect(wasSent(sent)).toBe(true)
    expect(sendButtonLabel(sent)).toBe("Invia di nuovo")
  })
})

describe("limite dell'allegato", () => {
  // Una ricevuta reale pesa ~5 KB: il caso non si presenta, ma se un giorno
  // si presentasse deve fermarsi qui e non dal provider a metà invio
  it("una ricevuta normale passa", () => {
    expect(attachmentTooLarge(5 * 1024)).toBe(false)
  })

  it("un allegato enorme viene fermato prima di partire", () => {
    expect(attachmentTooLarge(30 * 1024 * 1024)).toBe(true)
  })
})
