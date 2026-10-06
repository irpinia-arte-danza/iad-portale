import { describe, expect, it } from "vitest"

import {
  escapeHtml,
  substituteVariables,
  substituteVariablesHtml,
} from "./template-vars"

describe("variabili dei modelli email", () => {
  it("nel testo e nell'oggetto i valori passano così come sono", () => {
    expect(substituteVariables("Ciao {nome}, {importo}", { nome: "A & B", importo: 50 })).toBe(
      "Ciao A & B, 50",
    )
  })

  it("una variabile sconosciuta resta scritta com'è", () => {
    expect(substituteVariables("{x} e {nome}", { nome: "Maria" })).toBe("{x} e Maria")
  })

  it("nel corpo HTML un nome con un tag esce come testo", () => {
    const html = substituteVariablesHtml("<p>Gentile {genitore_nome},</p>", {
      genitore_nome: 'Mario <img src=x onerror="alert(1)">',
    })
    expect(html).toBe(
      "<p>Gentile Mario &lt;img src=x onerror=&quot;alert(1)&quot;&gt;,</p>",
    )
    expect(html).not.toContain("<img")
  })

  it("il modello resta HTML, cambiano solo i valori", () => {
    const html = substituteVariablesHtml('<a href="{link}">{allieva_nome}</a>', {
      link: "https://area.irpiniaartedanza.it/parent?x=1&y=2",
      allieva_nome: "O'Neil",
    })
    expect(html).toBe(
      '<a href="https://area.irpiniaartedanza.it/parent?x=1&amp;y=2">O&#39;Neil</a>',
    )
  })

  it("escapeHtml copre i cinque caratteri", () => {
    expect(escapeHtml(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&#39;")
  })
})
