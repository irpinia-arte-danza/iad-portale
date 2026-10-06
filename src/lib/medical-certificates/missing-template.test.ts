import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { CERT_MISSING_TEMPLATE_SLUG } from "@/lib/resend/template-usage"
import { substituteVariables } from "@/lib/resend/template-vars"

// Il testo vive nel database (Testi delle email) e ci arriva con una
// migration. Qui si controlla il testo che la migration inserisce: che parli
// del certificato mancante e che le sue variabili siano quelle che l'invio
// compila davvero.
const sql = readFileSync(
  join(
    process.cwd(),
    "prisma/migrations/20261007090000_cert_missing_email_template/migration.sql",
  ),
  "utf-8",
)

// I valori fra apici dell'INSERT, nell'ordine delle colonne
// (solo dopo VALUES: i commenti in cima hanno apostrofi)
const values = [
  ...sql.slice(sql.indexOf("VALUES (")).matchAll(/'((?:[^']|'')*)'/g),
].map((m) =>
  m[1].replace(/''/g, "'"),
)
const [, slug, , , subject, bodyHtml, bodyText] = values

const VARS = { genitore_nome: "Giuseppina Ciociola", allieva_nome: "Maria Rossi" }

describe("testo «certificato-mancante»", () => {
  it("la migration inserisce proprio quel testo", () => {
    expect(slug).toBe(CERT_MISSING_TEMPLATE_SLUG)
  })

  it("compila il genitore e l'allieva, e non lascia segnaposto", () => {
    for (const part of [subject, bodyHtml, bodyText]) {
      const out = substituteVariables(part, VARS)
      expect(out).not.toMatch(/\{\w+\}/)
    }
    const text = substituteVariables(bodyText, VARS)
    expect(text).toContain("Gentile Giuseppina Ciociola")
    expect(text).toContain("per Maria Rossi non abbiamo ancora il certificato")
  })

  it("dice la conseguenza e cosa fare", () => {
    expect(bodyText).toContain("Senza certificato non può fare lezione")
    expect(bodyText).toContain("portarlo in sala o inviarcelo")
  })

  it("non parla di scadenze: per un certificato che non c'è non ce n'è una", () => {
    expect(bodyText).not.toContain("{data_scadenza}")
    expect(bodyText).not.toContain("scade")
  })

  it("è additiva: se il testo esiste già non lo tocca", () => {
    expect(sql).toContain("ON CONFLICT (slug) DO NOTHING")
    expect(sql).not.toMatch(/\b(UPDATE|DELETE|ALTER|DROP)\b/)
  })

  it("il testo per WhatsApp è senza HTML", () => {
    expect(bodyText).not.toMatch(/<[^>]+>/)
  })
})
