import { describe, expect, it } from "vitest"

import {
  compactAcademicYear,
  counterCandidate,
  formatReceiptNumber,
  NO_PERIOD_KEY,
  nextReceiptSequence,
  periodKey,
  receiptCategorySuffix,
  yearSegment,
  type ReceiptNumberingConfig,
} from "./numbering-config"

// Giorno di calendario a mezzanotte UTC, come todayInRome() e le colonne
// @db.Date
function day(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`)
}

// Il formato in uso prima che le opzioni esistessero: i default della
// migration devono riprodurre esattamente questo
const COME_PRIMA: ReceiptNumberingConfig = {
  prefix: "IAD/",
  yearMode: "ACADEMIC",
  resetMode: "NEVER",
  digits: 3,
}

// Quello che sceglierà Giuseppina
const ANNO_SOLARE: ReceiptNumberingConfig = {
  prefix: "IAD/",
  yearMode: "CALENDAR",
  resetMode: "CALENDAR",
  digits: 3,
}

describe("il formato di prima resta identico", () => {
  it("IAD/2026-27/295", () => {
    expect(
      formatReceiptNumber({
        config: COME_PRIMA,
        issueDate: day("2026-09-16"),
        academicYearLabel: "2026-2027",
        sequence: 295,
        category: "REGULAR",
      }),
    ).toBe("IAD/2026-27/295")
  })

  it("saggio e costume tengono il loro suffisso", () => {
    const base = {
      config: COME_PRIMA,
      issueDate: day("2026-09-16"),
      academicYearLabel: "2026-2027",
    }
    expect(
      formatReceiptNumber({ ...base, sequence: 295, category: "SHOWCASE" }),
    ).toBe("IAD/2026-27/295/S")
    expect(
      formatReceiptNumber({ ...base, sequence: 7, category: "COSTUME" }),
    ).toBe("IAD/2026-27/007/C")
  })

  it("senza riavvio il periodo è sempre lo stesso", () => {
    expect(periodKey(COME_PRIMA, day("2026-12-31"), "2026-2027")).toBe(
      NO_PERIOD_KEY,
    )
    expect(periodKey(COME_PRIMA, day("2027-01-01"), "2026-2027")).toBe(
      NO_PERIOD_KEY,
    )
  })
})

describe("le altre combinazioni", () => {
  it("anno solare", () => {
    expect(
      formatReceiptNumber({
        config: ANNO_SOLARE,
        issueDate: day("2026-12-31"),
        academicYearLabel: "2026-2027",
        sequence: 327,
        category: "REGULAR",
      }),
    ).toBe("IAD/2026/327")
  })

  it("nessun anno", () => {
    expect(
      formatReceiptNumber({
        config: { ...COME_PRIMA, yearMode: "NONE" },
        issueDate: day("2026-12-31"),
        academicYearLabel: "2026-2027",
        sequence: 327,
        category: "REGULAR",
      }),
    ).toBe("IAD/327")
  })

  it("cifre: 1, 001, 0001", () => {
    const base = {
      issueDate: day("2026-12-31"),
      academicYearLabel: null,
      sequence: 7,
      category: "REGULAR" as const,
    }
    const senzaAnno = { ...COME_PRIMA, yearMode: "NONE" as const }
    expect(
      formatReceiptNumber({ ...base, config: { ...senzaAnno, digits: 1 } }),
    ).toBe("IAD/7")
    expect(
      formatReceiptNumber({ ...base, config: { ...senzaAnno, digits: 3 } }),
    ).toBe("IAD/007")
    expect(
      formatReceiptNumber({ ...base, config: { ...senzaAnno, digits: 4 } }),
    ).toBe("IAD/0007")
  })

  // Un progressivo più lungo delle cifre scelte non viene troncato
  it("il progressivo non si tronca mai", () => {
    expect(
      formatReceiptNumber({
        config: { ...COME_PRIMA, yearMode: "NONE", digits: 3 },
        issueDate: day("2026-12-31"),
        academicYearLabel: null,
        sequence: 1234,
        category: "REGULAR",
      }),
    ).toBe("IAD/1234")
  })

  // Senza un anno accademico che contenga la data, il segmento sparisce
  // invece di inventare un'etichetta
  it("anno accademico assente: nessun segmento, e il riavvio non scatta", () => {
    expect(yearSegment(COME_PRIMA, day("2026-12-31"), null)).toBeNull()
    expect(
      periodKey({ resetMode: "ACADEMIC" }, day("2026-12-31"), null),
    ).toBe(NO_PERIOD_KEY)
  })
})

describe("mezzanotte del 31 dicembre", () => {
  const CAPODANNO = day("2027-01-01")
  const SILVESTRO = day("2026-12-31")

  it("il periodo cambia col giorno di emissione", () => {
    expect(periodKey(ANNO_SOLARE, SILVESTRO, "2026-2027")).toBe("2026")
    expect(periodKey(ANNO_SOLARE, CAPODANNO, "2026-2027")).toBe("2027")
  })

  it("l'ultima del 31 prosegue, la prima del 1° riparte da 1", () => {
    const contatore = { period: "2026", number: 326 }

    // 31 dicembre: stesso periodo, il contatore prosegue
    const ultima = counterCandidate(contatore, "2026")
    expect(ultima).toBe(327)
    expect(
      formatReceiptNumber({
        config: ANNO_SOLARE,
        issueDate: SILVESTRO,
        academicYearLabel: "2026-2027",
        sequence: nextReceiptSequence(ultima, 326),
        category: "REGULAR",
      }),
    ).toBe("IAD/2026/327")

    // 1° gennaio: periodo nuovo, nessuna ricevuta ancora emessa nel 2027
    const prima = counterCandidate({ period: "2026", number: 327 }, "2027")
    expect(prima).toBe(1)
    expect(
      formatReceiptNumber({
        config: ANNO_SOLARE,
        issueDate: CAPODANNO,
        academicYearLabel: "2026-2027",
        sequence: nextReceiptSequence(prima, 0),
        category: "REGULAR",
      }),
    ).toBe("IAD/2027/001")
  })

  // Due emissioni a cavallo: la seconda trova il periodo già aggiornato e
  // incrementa, senza ripartire né saltare
  it("due emissioni consecutive dopo il cambio di periodo", () => {
    const dopoLaPrima = { period: "2027", number: 1 }
    expect(counterCandidate(dopoLaPrima, "2027")).toBe(2)
    expect(nextReceiptSequence(2, 1)).toBe(2)
  })

  // L'anno accademico non cambia a capodanno: con quel riavvio la serie
  // attraversa il capodanno senza ripartire
  it("col riavvio accademico capodanno non è un confine", () => {
    const accademico = { ...ANNO_SOLARE, resetMode: "ACADEMIC" as const }
    expect(periodKey(accademico, SILVESTRO, "2026-2027")).toBe("2026-2027")
    expect(periodKey(accademico, CAPODANNO, "2026-2027")).toBe("2026-2027")
  })
})

describe("pagamento vecchio, ricevuta emessa oggi", () => {
  // Il bonifico è del 30 dicembre, la ricevuta si emette il 3 gennaio: la
  // ricevuta appartiene al 2027, non al 2026
  const EMISSIONE = day("2027-01-03")

  it("l'anno è quello dell'emissione, non del pagamento", () => {
    expect(
      formatReceiptNumber({
        config: ANNO_SOLARE,
        issueDate: EMISSIONE,
        academicYearLabel: "2026-2027",
        sequence: 1,
        category: "REGULAR",
      }),
    ).toBe("IAD/2027/001")
  })

  it("etichetta e contatore leggono la stessa data", () => {
    expect(yearSegment(ANNO_SOLARE, EMISSIONE, "2026-2027")).toBe("2027")
    expect(periodKey(ANNO_SOLARE, EMISSIONE, "2026-2027")).toBe("2027")
  })

  // Con il riavvio accademico il pagamento vecchio non fa ripartire nulla:
  // il periodo è quello dell'anno accademico che contiene l'emissione
  it("col riavvio accademico conta l'anno che contiene l'emissione", () => {
    const accademico = { ...ANNO_SOLARE, resetMode: "ACADEMIC" as const }
    expect(periodKey(accademico, EMISSIONE, "2026-2027")).toBe("2026-2027")
  })
})

describe("cambio di configurazione a metà anno", () => {
  // Il caso della transizione di dicembre: si passa al riavvio solare
  // quando nel 2026 ci sono già 32 ricevute fino alla 326. Il progressivo
  // deve proseguire da 327, non ripartire da 1.
  it("la serie prosegue, non riparte", () => {
    const contatore = { period: NO_PERIOD_KEY, number: 326 }
    const candidato = counterCandidate(contatore, "2026")
    expect(candidato).toBe(1) // il periodo risulta cambiato...

    // ...ma il massimo già emesso nel 2026 lo rimette in riga
    const sequence = nextReceiptSequence(candidato, 326)
    expect(sequence).toBe(327)
    expect(
      formatReceiptNumber({
        config: ANNO_SOLARE,
        issueDate: day("2026-12-15"),
        academicYearLabel: "2026-2027",
        sequence,
        category: "REGULAR",
      }),
    ).toBe("IAD/2026/327")
  })
})

describe("pezzi del formato", () => {
  it("l'anno accademico si accorcia", () => {
    expect(compactAcademicYear("2026-2027")).toBe("2026-27")
    expect(compactAcademicYear("2026")).toBe("2026")
  })

  it("suffissi di saggio e costume", () => {
    expect(receiptCategorySuffix("REGULAR")).toBe("")
    expect(receiptCategorySuffix("SHOWCASE")).toBe("/S")
    expect(receiptCategorySuffix("COSTUME")).toBe("/C")
  })
})

describe("nextReceiptSequence", () => {
  it("prima ricevuta dopo la numerazione cartacea: 295", () => {
    expect(nextReceiptSequence(295, 0)).toBe(295)
  })

  it("candidato più alto dell'ultima emessa: vale il candidato", () => {
    expect(nextReceiptSequence(296, 295)).toBe(296)
  })

  it("candidato uguale a un numero già emesso: il successivo", () => {
    expect(nextReceiptSequence(300, 300)).toBe(301)
  })

  it("candidato sotto un numero emesso: si riparte dopo il più alto", () => {
    expect(nextReceiptSequence(10, 300)).toBe(301)
  })
})
