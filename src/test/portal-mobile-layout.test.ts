import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

// ─────────────────────────────────────────────────────────────────────────
// Le aree /parent e /teacher si usano dal telefono (375 px). Senza
// Playwright non si misura il rendering: si controlla il sorgente per le
// cose che sicuramente sforano o contraddicono le regole della casa:
// tabelle (<table>), larghezze fisse da 375 px in su, scorrimento
// orizzontale, colori di stato scritti a mano al posto di statusTone
// (§17.43). Ogni violazione esce con file e riga.
// ─────────────────────────────────────────────────────────────────────────

const ROOT = fileURLToPath(new URL("../app", import.meta.url))
const AREAS = ["(parent)", "(teacher)"]

function tsxFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...tsxFiles(full))
    else if (full.endsWith(".tsx") && !full.endsWith(".test.tsx")) out.push(full)
  }
  return out
}

type Rule = { name: string; test: (line: string) => boolean }

const FIXED_WIDTH = /\b(?:min-)?w-\[(\d+)px\]/g

const RULES: Rule[] = [
  { name: "tabella HTML (<table>/<Table>): sotto 768 va una card", test: (l) => /<[Tt]able\b/.test(l) },
  {
    name: "larghezza fissa ≥ 375 px",
    test: (l) => [...l.matchAll(FIXED_WIDTH)].some((m) => Number(m[1]) >= 375),
  },
  { name: "scorrimento orizzontale (overflow-x-auto)", test: (l) => /\boverflow-x-auto\b/.test(l) },
  {
    name: "colore di stato scritto a mano (usare statusTone / TONE_BADGE, §17.43)",
    test: (l) => /\b(?:text|bg|border)-(?:red|amber|emerald)-\d/.test(l),
  },
]

// Un Badge distruttivo è un colore di stato scritto a mano: il tag può
// stare su più righe, si cerca sul file intero
const DESTRUCTIVE_BADGE = /<Badge\b[^>]*variant=["']destructive["']/g

export function scanPortalSources(): string[] {
  const violations: string[] = []
  for (const area of AREAS) {
    for (const file of tsxFiles(join(ROOT, area))) {
      const rel = file.slice(ROOT.length + 1)
      const source = readFileSync(file, "utf8")
      const lines = source.split("\n")
      lines.forEach((line, i) => {
        for (const rule of RULES) {
          if (rule.test(line)) violations.push(`${rel}:${i + 1} — ${rule.name}`)
        }
      })
      for (const m of source.matchAll(DESTRUCTIVE_BADGE)) {
        const line = source.slice(0, m.index).split("\n").length
        violations.push(`${rel}:${line} — Badge variant="destructive" (usare statusTone)`)
      }
    }
  }
  return violations
}

describe("area famiglie a 375 px", () => {
  it("nessuna tabella, larghezza fissa, scorrimento orizzontale o colore di stato a mano", () => {
    const violations = scanPortalSources()
    expect(violations, `\n${violations.join("\n")}\n`).toEqual([])
  })
})
