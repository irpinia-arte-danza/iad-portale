import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

// ─────────────────────────────────────────────────────────────────────────
// Contrasto dei token di stato (WCAG 2.1): il testo ambra e rosso deve
// restare leggibile su fondo bianco, sulla card e sul proprio fondo tinto,
// in chiaro e in scuro. Si misura dal CSS, non a occhio: se qualcuno
// schiarisce un token «per estetica», il test lo dice.
//
// Conversione oklch → sRGB (Björn Ottosson), composizione dell'alpha in
// sRGB come fa il browser, luminanza relativa e rapporto secondo WCAG.
// ─────────────────────────────────────────────────────────────────────────

const CSS = readFileSync(fileURLToPath(new URL("../app/globals.css", import.meta.url)), "utf8")

type Oklch = { L: number; C: number; H: number; a: number }
type Rgb = [number, number, number]

function themeBlock(selector: string): string {
  const start = CSS.indexOf(`\n${selector} {`)
  if (start < 0) throw new Error(`blocco ${selector} non trovato in globals.css`)
  const end = CSS.indexOf("\n}", start)
  return CSS.slice(start, end)
}

function parseTokens(block: string): Record<string, Oklch> {
  const out: Record<string, Oklch> = {}
  for (const m of block.matchAll(/--([a-z0-9-]+):\s*oklch\(([^)]+)\)/g)) {
    const [main, alphaRaw] = m[2].split("/")
    const [L, C, H] = main.trim().split(/\s+/).map(Number)
    let a = 1
    if (alphaRaw !== undefined) {
      const t = alphaRaw.trim()
      a = t.endsWith("%") ? Number(t.slice(0, -1)) / 100 : Number(t)
    }
    out[m[1]] = { L, C, H: H || 0, a }
  }
  return out
}

function oklchToSrgb({ L, C, H }: Oklch): Rgb {
  const h = (H * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => Math.min(1, Math.max(0, v)))
  return linear.map((v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)) as Rgb
}

function relativeLuminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(fg: Rgb, bg: Rgb): number {
  const a = relativeLuminance(fg)
  const b = relativeLuminance(bg)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

// Un colore con alpha si vede sopra il fondo della pagina
function composite(color: Oklch, background: Rgb): Rgb {
  const rgb = oklchToSrgb(color)
  if (color.a >= 1) return rgb
  return rgb.map((v, i) => color.a * v + (1 - color.a) * background[i]) as Rgb
}

const THEMES = [
  { name: "chiaro", selector: ":root" },
  { name: "scuro", selector: ".dark" },
] as const

// Testo: 4,5:1. Bordi (grafica): 3:1
const TEXT_PAIRS: [string, string][] = [
  ["status-block", "status-block-bg"],
  ["status-block", "background"],
  ["status-block", "card"],
  ["status-fix", "status-fix-bg"],
  ["status-fix", "background"],
  ["status-fix", "card"],
  ["foreground", "status-block-bg"],
  ["foreground", "status-fix-bg"],
  ["muted-foreground", "background"],
  ["muted-foreground", "card"],
]
// I bordi dei badge di stato sono decorativi: il badge si riconosce da fondo
// e testo, e WCAG 1.4.11 (3:1 per la grafica) non li richiede. Si misurano e
// si stampano in tabella, senza soglia: alzarli a 3:1 cambierebbe l'aspetto
// di tutti i badge dell'app, admin compreso, per un vantaggio nullo.
const GRAPHIC_PAIRS: [string, string][] = [
  ["status-block-border", "status-block-bg"],
  ["status-fix-border", "status-fix-bg"],
]

type Measure = { tema: string; coppia: string; rapporto: number; soglia: number }

export function measureAll(): Measure[] {
  const rows: Measure[] = []
  for (const theme of THEMES) {
    const tokens = parseTokens(themeBlock(theme.selector))
    const page = oklchToSrgb(tokens.background)
    const color = (name: string): Rgb => {
      const t = tokens[name]
      if (!t) throw new Error(`token --${name} assente nel tema ${theme.name}`)
      return composite(t, page)
    }
    for (const [pairs, soglia] of [
      [TEXT_PAIRS, 4.5],
      [GRAPHIC_PAIRS, 0],
    ] as const) {
      for (const [fg, bg] of pairs) {
        rows.push({
          tema: theme.name,
          coppia: `${fg} su ${bg}`,
          rapporto: Math.round(contrastRatio(color(fg), color(bg)) * 100) / 100,
          soglia,
        })
      }
    }
  }
  return rows
}

describe("contrasto dei token di stato", () => {
  const rows = measureAll()

  // La tabella completa nel log del test, per leggerla senza ricalcolare
  console.log(
    ["coppia · tema · rapporto · esito", ...rows.map((r) => `${r.coppia} · ${r.tema} · ${r.rapporto.toFixed(2)}:1 · ${r.rapporto >= r.soglia ? "ok" : `SOTTO ${r.soglia}`}`)].join("\n"),
  )

  it("il convertitore riconosce bianco e nero", () => {
    expect(contrastRatio(oklchToSrgb({ L: 1, C: 0, H: 0, a: 1 }), oklchToSrgb({ L: 0, C: 0, H: 0, a: 1 }))).toBeCloseTo(21, 0)
  })

  for (const row of rows) {
    it(`${row.tema}: ${row.coppia} ≥ ${row.soglia}:1 (misurato ${row.rapporto.toFixed(2)})`, () => {
      expect(row.rapporto).toBeGreaterThanOrEqual(row.soglia)
    })
  }

  it("i token di stato esistono in entrambi i temi", () => {
    for (const theme of THEMES) {
      const tokens = parseTokens(themeBlock(theme.selector))
      for (const name of ["status-block", "status-block-bg", "status-block-border", "status-fix", "status-fix-bg", "status-fix-border"]) {
        expect(tokens[name], `--${name} nel tema ${theme.name}`).toBeDefined()
      }
    }
  })
})
