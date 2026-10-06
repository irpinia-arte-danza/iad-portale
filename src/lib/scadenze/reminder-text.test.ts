import { describe, expect, it } from "vitest"

import { htmlToPlainText, reminderWhatsappText } from "./reminder-text"

describe("testo del sollecito per WhatsApp", () => {
  it("usa il corpo testuale del modello quando c'è", () => {
    expect(
      reminderWhatsappText({ bodyText: "Ciao Anna", bodyHtml: "<p>Altro</p>" }),
    ).toBe("Ciao Anna")
  })

  it("senza corpo testuale ricava dall'HTML", () => {
    const html =
      "<p>Gentile Anna,</p><p>la quota di <strong>ottobre</strong> è di 40,00 &euro;.</p>"
    expect(reminderWhatsappText({ bodyText: null, bodyHtml: html })).toBe(
      "Gentile Anna,\nla quota di ottobre è di 40,00 €.",
    )
  })

  it("a capo, elenchi ed entità", () => {
    expect(
      htmlToPlainText("<p>Rate:</p><ul><li>ottobre</li><li>novembre</li></ul>"),
    ).toBe("Rate:\n• ottobre\n• novembre")
    expect(htmlToPlainText("uno<br>due")).toBe("uno\ndue")
    expect(htmlToPlainText("<p>a &amp; b &quot;c&quot;</p>")).toBe('a & b "c"')
    expect(htmlToPlainText("<p>40,00 &#8364;</p>")).toBe("40,00 €")
  })

  it("un corpo testuale di soli spazi non vale", () => {
    expect(
      reminderWhatsappText({ bodyText: "   ", bodyHtml: "<p>Vero testo</p>" }),
    ).toBe("Vero testo")
  })
})
