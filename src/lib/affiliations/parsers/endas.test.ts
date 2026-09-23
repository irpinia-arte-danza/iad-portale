import { describe, expect, it } from "vitest"

import { endasCardParser } from "./endas"

// Il testo che arriva da `extractPdfText` è appiattito: PDF.js non garantisce
// né gli a capo né l'ordine delle colonne. Le prove usano le due impaginazioni
// plausibili della stessa tessera.

const TABLE_LAYOUT = [
  "TESSERA N° 1293190 Plus - Anno sociale 2026",
  "Data iscrizione 14/09/2026",
  "Data scadenza 13/09/2027",
  "AFFILIATA A.S.D. IAD - IRPINIA ARTE DANZA",
  "NOME COGNOME DATA DI NASCITA SESSO",
  "GIULIA ESPOSITO 12/05/2010 F",
].join("\n")

// Il tracciato vero del portale ENDAS, verificato su una tessera emessa:
// etichette in fila, la riga sulla validità in mezzo e la provincia prima del
// nome. I dati della persona qui sono inventati — quelli veri non stanno in
// un file del repository.
const LABELLED_LAYOUT = [
  "TESSERA N° 1293190 Plus - Anno sociale 2026",
  "Data iscrizione 14/09/2026",
  "Data scadenza 13/09/2027",
  "Validità 365 giorni dall'inserimento dati e convalida nella piattaforma E.N.D.A.S.",
  "AFFILIATA A.S.D. IAD - IRPINIA ARTE DANZA",
  "PROVINCIA AV",
  "NOME GIULIA COGNOME ESPOSITO DATA DI NASCITA 12/05/2010 SESSO F",
  "LA SOSTENIBILITA' E' IL NOSTRO SPORT www.endas.it www.servizi.endas.it",
].join("\n")

function ok(result: ReturnType<typeof endasCardParser.parse>) {
  if (!result.ok) throw new Error(`atteso ok, ricevuto ${result.reason}`)
  return result.card
}

describe("endasCardParser", () => {
  it("legge i dati della tessera dall'impaginazione a tabella", () => {
    const card = ok(endasCardParser.parse(TABLE_LAYOUT))

    expect(card.entity).toBe("ENDAS")
    expect(card.cardNumber).toBe("1293190")
    expect(card.cardType).toBe("Plus")
    expect(card.cardYear).toBe(2026)
    expect(card.issueDate.toISOString()).toBe("2026-09-14T00:00:00.000Z")
    expect(card.expiryDate.toISOString()).toBe("2027-09-13T00:00:00.000Z")
  })

  it("legge l'intestataria dall'impaginazione a tabella", () => {
    const card = ok(endasCardParser.parse(TABLE_LAYOUT))

    expect(card.person?.tokens).toEqual(["GIULIA", "ESPOSITO"])
    expect(card.person?.dateOfBirth.toISOString()).toBe(
      "2010-05-12T00:00:00.000Z",
    )
    expect(card.person?.gender).toBe("F")
  })

  it("legge l'intestataria dall'impaginazione a etichette", () => {
    const card = ok(endasCardParser.parse(LABELLED_LAYOUT))

    expect(card.cardNumber).toBe("1293190")
    expect(card.cardType).toBe("Plus")
    expect(card.person?.tokens).toEqual(["GIULIA", "ESPOSITO"])
    expect(card.person?.dateOfBirth.toISOString()).toBe(
      "2010-05-12T00:00:00.000Z",
    )
    expect(card.person?.gender).toBe("F")
  })

  it("non si fa ingannare dal contorno del PDF vero", () => {
    const card = ok(endasCardParser.parse(LABELLED_LAYOUT))

    // "Validità 365 giorni", "PROVINCIA AV" e gli indirizzi web stanno in
    // mezzo ai dati: non devono entrare nel nome né spostare le date
    expect(card.person?.name).toBe("GIULIA ESPOSITO")
    expect(card.issueDate.toISOString()).toBe("2026-09-14T00:00:00.000Z")
    expect(card.expiryDate.toISOString()).toBe("2027-09-13T00:00:00.000Z")
  })

  it("non confonde la data di nascita con iscrizione e scadenza", () => {
    const card = ok(endasCardParser.parse(TABLE_LAYOUT))

    expect(card.person?.dateOfBirth.getUTCFullYear()).toBe(2010)
    expect(card.issueDate.getUTCFullYear()).toBe(2026)
  })

  it("tiene la tessera anche quando l'intestataria non si legge", () => {
    const senzaPersona = [
      "TESSERA N° 1293190 Plus - Anno sociale 2026",
      "Data iscrizione 14/09/2026",
      "Data scadenza 13/09/2027",
      "AFFILIATA A.S.D. IAD - IRPINIA ARTE DANZA",
    ].join("\n")

    const card = ok(endasCardParser.parse(senzaPersona))
    expect(card.cardNumber).toBe("1293190")
    expect(card.person).toBeNull()
  })

  it("accetta la tessera senza tipo", () => {
    const card = ok(
      endasCardParser.parse(
        "TESSERA N° 1293190 - Anno sociale 2026 Data iscrizione 14/09/2026 Data scadenza 13/09/2027",
      ),
    )
    expect(card.cardType).toBeNull()
    expect(card.cardNumber).toBe("1293190")
  })

  it("scarta un PDF che non è una tessera ENDAS", () => {
    const result = endasCardParser.parse(
      "Certificato di idoneità sportiva non agonistica. Valido fino al 13/09/2027.",
    )
    expect(result).toEqual({ ok: false, reason: "OTHER_ENTITY" })
  })

  it("scarta un PDF senza testo", () => {
    expect(endasCardParser.parse("   ")).toEqual({
      ok: false,
      reason: "OTHER_ENTITY",
    })
  })

  it("segnala quali dati mancano su una tessera incompleta", () => {
    const result = endasCardParser.parse(
      "TESSERA N° 1293190 Plus - Anno sociale 2026 Data iscrizione 14/09/2026",
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe("UNREADABLE")
    if (result.reason !== "UNREADABLE") return
    expect(result.missing).toEqual(["data scadenza"])
  })

  it("rifiuta una data che non esiste invece di traslarla", () => {
    const result = endasCardParser.parse(
      "TESSERA N° 1293190 Plus - Anno sociale 2026 Data iscrizione 31/02/2026 Data scadenza 13/09/2027",
    )
    expect(result.ok).toBe(false)
    if (result.ok || result.reason !== "UNREADABLE") return
    expect(result.missing).toEqual(["data iscrizione"])
  })
})
