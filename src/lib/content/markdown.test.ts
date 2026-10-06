import { describe, expect, it } from "vitest"

import {
  inlineText,
  markdownTitle,
  parseInline,
  parseMarkdown,
} from "./markdown"

describe("parseInline", () => {
  it("testo semplice", () => {
    expect(parseInline("ciao")).toEqual([{ type: "text", value: "ciao" }])
  })

  it("grassetto e link, anche uno dentro l'altro", () => {
    expect(parseInline("a **b** c")).toEqual([
      { type: "text", value: "a " },
      { type: "strong", children: [{ type: "text", value: "b" }] },
      { type: "text", value: " c" },
    ])
    expect(parseInline("[**x**](https://e.it)")).toEqual([
      {
        type: "link",
        href: "https://e.it",
        children: [{ type: "strong", children: [{ type: "text", value: "x" }] }],
      },
    ])
  })

  it("mailto e percorsi relativi sono link, javascript: resta testo", () => {
    expect(parseInline("[m](mailto:a@b.it)")[0]).toMatchObject({
      type: "link",
      href: "mailto:a@b.it",
    })
    expect(parseInline("[p](/privacy)")[0]).toMatchObject({ href: "/privacy" })
    expect(parseInline("[x](javascript:void0)")).toEqual([
      { type: "text", value: "[x](javascript:void0)" },
    ])
    expect(parseInline("[x](data:text/html,ciao)")).toEqual([
      { type: "text", value: "[x](data:text/html,ciao)" },
    ])
  })
})

describe("parseMarkdown", () => {
  it("titoli, paragrafi su più righe, elenchi e separatore", () => {
    const blocks = parseMarkdown(`# Titolo

Prima riga
seconda riga.

## Sezione

- uno
- due
  continua

1. primo
2. secondo

---`)
    expect(blocks).toEqual([
      { type: "heading", level: 1, children: [{ type: "text", value: "Titolo" }] },
      {
        type: "paragraph",
        children: [{ type: "text", value: "Prima riga seconda riga." }],
      },
      { type: "heading", level: 2, children: [{ type: "text", value: "Sezione" }] },
      {
        type: "list",
        ordered: false,
        items: [
          [{ type: "text", value: "uno" }],
          [{ type: "text", value: "due continua" }],
        ],
      },
      {
        type: "list",
        ordered: true,
        items: [
          [{ type: "text", value: "primo" }],
          [{ type: "text", value: "secondo" }],
        ],
      },
      { type: "rule" },
    ])
  })

  it("i commenti HTML non si mostrano, anche su più righe", () => {
    const blocks = parseMarkdown(`<!-- BOZZA
da rivedere -->
# T

testo <!-- nota --> fine`)
    expect(blocks).toEqual([
      { type: "heading", level: 1, children: [{ type: "text", value: "T" }] },
      { type: "paragraph", children: [{ type: "text", value: "testo  fine" }] },
    ])
  })

  it("markdownTitle prende il primo titolo di primo livello", () => {
    const blocks = parseMarkdown("## no\n\n# Sì **forte**\n")
    expect(markdownTitle(blocks)).toBe("Sì forte")
    expect(markdownTitle(parseMarkdown("solo testo"))).toBeNull()
  })

  it("l'informativa del repo si legge senza righe perse", async () => {
    const { readFile } = await import("node:fs/promises")
    const source = await readFile(
      new URL("../../../content/privacy.md", import.meta.url),
      "utf8",
    )
    const blocks = parseMarkdown(source)
    expect(markdownTitle(blocks)).toBe(
      "Informativa sul trattamento dei dati personali",
    )
    const text = blocks
      .flatMap((b) =>
        b.type === "list" ? b.items.map(inlineText) : b.type === "rule" ? [] : [inlineText(b.children)],
      )
      .join("\n")
    // Il commento BOZZA in testa non arriva in pagina, la nota nel testo sì
    expect(text).not.toContain("<!--")
    expect(text).toContain("bozza, da far rivedere prima della pubblicazione")
    // Normativa citata per intero, mai il solo 196/2003
    expect(text).toContain("Regolamento (UE) 2016/679")
    expect(text).toContain("D.Lgs. 196/2003")
    expect(text).toContain("D.Lgs. 101/2018")
    // Le sezioni richieste
    for (const heading of [
      "Titolare del trattamento",
      "Quali dati trattiamo",
      "Perché li trattiamo e su quale base giuridica",
      "Per quanto tempo li conserviamo",
      "Chi può conoscere i dati",
      "I tuoi diritti",
      "Cookie",
    ]) {
      expect(text).toContain(heading)
    }
    expect(text).toContain("90029290641")
  })
})
