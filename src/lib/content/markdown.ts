// ─────────────────────────────────────────────────────────────────────────
// Il poco Markdown che serve ai testi legali del portale.
//
// L'informativa privacy vive in content/privacy.md, così chi la rivede
// cambia un file di testo e non un componente. Qui non c'è una libreria:
// bastano titoli, paragrafi, elenchi, grassetto e link, e un parser di
// cinquanta righe si legge per intero, cosa che per un testo legale vale più
// della copertura di tutta la sintassi. Il risultato è un albero, non HTML:
// lo rende un componente React, che fa l'escape da solo.
// ─────────────────────────────────────────────────────────────────────────

export type InlineNode =
  | { type: "text"; value: string }
  | { type: "strong"; children: InlineNode[] }
  | { type: "link"; href: string; children: InlineNode[] }

export type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3; children: InlineNode[] }
  | { type: "paragraph"; children: InlineNode[] }
  | { type: "list"; ordered: boolean; items: InlineNode[][] }
  | { type: "rule" }

// Solo destinazioni che un'informativa può voler linkare. Tutto il resto
// (javascript:, data:, …) resta testo.
const SAFE_HREF = /^(https?:\/\/|mailto:|\/)/

const STRONG = /\*\*(.+?)\*\*/
const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/

export function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = []
  let rest = text

  while (rest.length > 0) {
    const strong = STRONG.exec(rest)
    const link = LINK.exec(rest)
    const first =
      strong && (!link || strong.index <= link.index)
        ? { kind: "strong" as const, match: strong }
        : link
          ? { kind: "link" as const, match: link }
          : null

    if (!first) {
      nodes.push({ type: "text", value: rest })
      break
    }

    const { match } = first
    if (match.index > 0) {
      nodes.push({ type: "text", value: rest.slice(0, match.index) })
    }
    if (first.kind === "strong") {
      nodes.push({ type: "strong", children: parseInline(match[1]) })
    } else if (SAFE_HREF.test(match[2])) {
      nodes.push({
        type: "link",
        href: match[2],
        children: parseInline(match[1]),
      })
    } else {
      nodes.push({ type: "text", value: match[0] })
    }
    rest = rest.slice(match.index + match[0].length)
  }

  return nodes
}

const HEADING = /^(#{1,3})\s+(.*)$/
const BULLET = /^[-*]\s+(.*)$/
const NUMBERED = /^\d+\.\s+(.*)$/
const RULE = /^(-{3,}|\*{3,})$/
// Riga che continua la voce di elenco precedente
const CONTINUATION = /^\s{2,}(\S.*)$/

export function parseMarkdown(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = []
  // I commenti HTML (la nota "BOZZA" in testa al file) non si mostrano
  const lines = source.replace(/<!--[\s\S]*?-->/g, "").split(/\r?\n/)

  let paragraph: string[] = []
  let list: { ordered: boolean; items: string[] } | null = null

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    blocks.push({
      type: "paragraph",
      children: parseInline(paragraph.join(" ")),
    })
    paragraph = []
  }
  const flushList = () => {
    if (!list) return
    blocks.push({
      type: "list",
      ordered: list.ordered,
      items: list.items.map(parseInline),
    })
    list = null
  }

  for (const raw of lines) {
    const line = raw.trimEnd()

    if (line.trim() === "") {
      flushParagraph()
      flushList()
      continue
    }

    const heading = HEADING.exec(line)
    if (heading) {
      flushParagraph()
      flushList()
      blocks.push({
        type: "heading",
        level: heading[1].length as 1 | 2 | 3,
        children: parseInline(heading[2].trim()),
      })
      continue
    }

    if (RULE.test(line.trim())) {
      flushParagraph()
      flushList()
      blocks.push({ type: "rule" })
      continue
    }

    const bullet = BULLET.exec(line)
    const numbered = bullet ? null : NUMBERED.exec(line)
    if (bullet || numbered) {
      flushParagraph()
      const ordered = numbered !== null
      if (!list || list.ordered !== ordered) {
        flushList()
        list = { ordered, items: [] }
      }
      list.items.push((bullet ?? numbered)![1].trim())
      continue
    }

    const continuation = list ? CONTINUATION.exec(raw) : null
    if (list && continuation) {
      list.items[list.items.length - 1] += ` ${continuation[1]}`
      continue
    }

    flushList()
    paragraph.push(line.trim())
  }

  flushParagraph()
  flushList()
  return blocks
}

export function inlineText(nodes: InlineNode[]): string {
  return nodes
    .map((n) => (n.type === "text" ? n.value : inlineText(n.children)))
    .join("")
}

// Il primo titolo di primo livello: diventa il <title> della pagina
export function markdownTitle(blocks: MarkdownBlock[]): string | null {
  const h1 = blocks.find((b) => b.type === "heading" && b.level === 1)
  return h1 && h1.type === "heading" ? inlineText(h1.children) : null
}
