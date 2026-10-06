import { describe, expect, it } from "vitest"

import { whatsappHref, whatsappNumber } from "./whatsapp"

describe("numero per WhatsApp", () => {
  it("toglie spazi, punti e trattini", () => {
    expect(whatsappNumber("333 123 4567")).toBe("393331234567")
    expect(whatsappNumber("333-123.4567")).toBe("393331234567")
  })

  it("accetta il prefisso in tutte le forme", () => {
    expect(whatsappNumber("+39 333 1234567")).toBe("393331234567")
    expect(whatsappNumber("0039 333 1234567")).toBe("393331234567")
    expect(whatsappNumber("393331234567")).toBe("393331234567")
  })

  it("senza numero non c'è link", () => {
    expect(whatsappNumber(null)).toBeNull()
    expect(whatsappNumber("")).toBeNull()
    expect(whatsappNumber("   ")).toBeNull()
    expect(whatsappHref(null, "ciao")).toBeNull()
  })
})

describe("link con il messaggio", () => {
  it("accenti e a capo passano codificati", () => {
    const href = whatsappHref("3331234567", "Però è così:\nservono 40,00 €")!
    expect(href.startsWith("https://wa.me/393331234567?text=")).toBe(true)
    const text = decodeURIComponent(href.split("?text=")[1])
    expect(text).toBe("Però è così:\nservono 40,00 €")
  })

  it("gli spazi diventano %20, mai +", () => {
    const href = whatsappHref("3331234567", "due parole")!
    expect(href).toContain("due%20parole")
    expect(href).not.toContain("+")
  })

  it("senza testo è solo la chat", () => {
    expect(whatsappHref("3331234567")).toBe("https://wa.me/393331234567")
    expect(whatsappHref("3331234567", "   ")).toBe("https://wa.me/393331234567")
  })
})
