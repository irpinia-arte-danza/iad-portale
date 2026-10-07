import { describe, expect, it } from "vitest"

import {
  isValidItalianIban,
  ITALIAN_IBAN_LENGTH,
  italianIbanSchema,
} from "./fiscal-validators"

// Esempi noti: l'IBAN italiano di esempio della documentazione SWIFT e uno
// tedesco valido (per il controllo sul paese)
const IT_VALIDO = "IT60X0542811101000000123456"
const DE_VALIDO = "DE89370400440532013000"

// Ricalcolo indipendente del mod 97 (ISO 7064), con BigInt: il test non
// deve fidarsi della stessa aritmetica della funzione
function mod97Indipendente(iban: string): number {
  const riordinato = iban.slice(4) + iban.slice(0, 4)
  const numerico = [...riordinato]
    .map((ch) => (/\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55)))
    .join("")
  return Number(BigInt(numerico) % BigInt(97))
}

describe("isValidItalianIban", () => {
  it("accetta un IBAN italiano valido, anche minuscolo e con spazi", () => {
    expect(isValidItalianIban(IT_VALIDO)).toBe(true)
    expect(isValidItalianIban("IT60 X054 2811 1010 0000 0123 456")).toBe(true)
    expect(isValidItalianIban("it60x0542811101000000123456")).toBe(true)
    expect(IT_VALIDO).toHaveLength(ITALIAN_IBAN_LENGTH)
    expect(mod97Indipendente(IT_VALIDO)).toBe(1)
  })

  it("rifiuta le cifre di controllo sbagliate", () => {
    const sbagliato = "IT61X0542811101000000123456"
    expect(mod97Indipendente(sbagliato)).not.toBe(1)
    expect(isValidItalianIban(sbagliato)).toBe(false)
    // Una cifra del conto cambiata: la forma è giusta, il checksum no
    const battitura = "IT60X0542811101000000123457"
    expect(mod97Indipendente(battitura)).not.toBe(1)
    expect(isValidItalianIban(battitura)).toBe(false)
  })

  it("rifiuta la lunghezza sbagliata (26 e 28 caratteri)", () => {
    expect(isValidItalianIban(IT_VALIDO.slice(0, 26))).toBe(false)
    expect(isValidItalianIban(`${IT_VALIDO}7`)).toBe(false)
  })

  it("rifiuta un IBAN non italiano anche se valido nel suo paese", () => {
    expect(mod97Indipendente(DE_VALIDO)).toBe(1)
    expect(isValidItalianIban(DE_VALIDO)).toBe(false)
  })

  it("rifiuta la stringa vuota e il rumore", () => {
    expect(isValidItalianIban("")).toBe(false)
    expect(isValidItalianIban("   ")).toBe(false)
    expect(isValidItalianIban("IT")).toBe(false)
    expect(isValidItalianIban("ITXXX0542811101000000123456")).toBe(false)
  })

  it("il checksum della funzione coincide con il ricalcolo su un campione", () => {
    // Variazioni dell'ultima cifra: solo una delle dieci ha mod 97 = 1
    const base = IT_VALIDO.slice(0, -1)
    const validi = [...Array(10).keys()].filter((d) => isValidItalianIban(`${base}${d}`))
    const attesi = [...Array(10).keys()].filter((d) => mod97Indipendente(`${base}${d}`) === 1)
    expect(validi).toEqual(attesi)
    expect(validi).toEqual([6])
  })
})

describe("italianIbanSchema", () => {
  it("accetta il campo vuoto o assente: l'IBAN è facoltativo", () => {
    expect(italianIbanSchema.safeParse("").success).toBe(true)
    expect(italianIbanSchema.safeParse(undefined).success).toBe(true)
    expect(italianIbanSchema.safeParse("  ").success).toBe(true)
  })

  it("accetta l'IBAN valido e lo lascia come scritto (la normalizzazione è dell'azione)", () => {
    const result = italianIbanSchema.safeParse(" IT60 X054 2811 1010 0000 0123 456 ")
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe("IT60 X054 2811 1010 0000 0123 456")
  })

  it("rifiuta un IBAN errato con il messaggio italiano", () => {
    const result = italianIbanSchema.safeParse("IT61X0542811101000000123456")
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/IBAN non valido/)
      expect(result.error.issues[0]?.message).toMatch(/IT/)
      expect(result.error.issues[0]?.message).toMatch(/27/)
    }
    expect(italianIbanSchema.safeParse(DE_VALIDO).success).toBe(false)
  })
})
