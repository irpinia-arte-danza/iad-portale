import { describe, expect, it } from "vitest"

import { withPrivacyFooter } from "./privacy-footer"

const URL = "https://area.irpiniaartedanza.it/privacy"

describe("withPrivacyFooter", () => {
  it("aggiunge il link in fondo a html e testo quando manca", () => {
    const out = withPrivacyFooter(
      { html: "<p>Ciao</p>", text: "Ciao" },
      URL,
    )
    expect(out.html).toBe(
      `<p>Ciao</p>\n<p><small><a href="${URL}">Informativa privacy</a></small></p>`,
    )
    expect(out.text).toBe(`Ciao\nInformativa privacy: ${URL}`)
  })

  it("non lo raddoppia se il modello lo contiene già", () => {
    const html = `<p>Leggi <a href="${URL}">qui</a></p>`
    const text = `Leggi ${URL}`
    expect(withPrivacyFooter({ html, text }, URL)).toEqual({ html, text })
  })

  it("html e testo si valutano separatamente", () => {
    const out = withPrivacyFooter(
      { html: `<a href="${URL}">x</a>`, text: "senza link" },
      URL,
    )
    expect(out.html).not.toContain("Informativa privacy</a></small>")
    expect(out.text).toContain(URL)
  })
})
