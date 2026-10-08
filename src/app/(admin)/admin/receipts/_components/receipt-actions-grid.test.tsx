import fs from "node:fs"
import path from "node:path"

import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  RECEIPT_ACTION_CLASS,
  RECEIPT_ACTION_LAST_ODD_CLASS,
  ReceiptActionsGrid,
} from "./receipt-actions-grid"

// Niente motore di layout qui (vedi CLAUDE.md): si controlla il markup che
// decide la disposizione. Le larghezze vere sono misurate nel browser a 390,
// 640, pannello a 640 e 1440 (vedi la PR).

describe("ReceiptActionsGrid", () => {
  const html = renderToStaticMarkup(
    <ReceiptActionsGrid>
      <button className={RECEIPT_ACTION_CLASS}>Apri</button>
      <button className={RECEIPT_ACTION_CLASS}>Scarica</button>
      <button className={RECEIPT_ACTION_CLASS}>Condividi</button>
      <button className={RECEIPT_ACTION_CLASS}>Invia per email</button>
    </ReceiptActionsGrid>,
  )

  it("decide il contenitore, non la finestra: container query, nessun breakpoint di viewport", () => {
    expect(html).toContain('class="@container"')
    expect(html).not.toMatch(/\b(sm|md|lg|xl):/)
  })

  it("2×2 di base, una riga con a capo da 640 px di contenitore", () => {
    expect(html).toContain("grid grid-cols-2")
    expect(html).toContain("@[40rem]:flex")
    expect(html).toContain("@[40rem]:flex-wrap")
  })

  it("ogni tasto è alto 44 px e può restringersi nella sua cella", () => {
    const classes = RECEIPT_ACTION_CLASS.split(" ")
    expect(classes).toContain("h-11")
    expect(classes).toContain("min-w-0")
  })

  it("con tre tasti l'ultimo prende tutta la riga della griglia", () => {
    expect(RECEIPT_ACTION_LAST_ODD_CLASS).toContain("col-span-2")
    expect(RECEIPT_ACTION_LAST_ODD_CLASS).toContain("@[40rem]:col-span-1")
  })
})

describe("ReceiptEmailActions", () => {
  const source = fs.readFileSync(path.join(__dirname, "receipt-email-actions.tsx"), "utf8")

  it("mette i quattro tasti nella griglia, senza righe flex decise dalla finestra", () => {
    expect(source).toContain("<ReceiptActionsGrid>")
    expect(source).not.toContain("sm:flex-row")
    expect(source.match(/RECEIPT_ACTION_CLASS/g)?.length).toBeGreaterThanOrEqual(5)
  })

  it("il tasto principale è Condividi dove il browser condivide file, Invia altrove", () => {
    expect(source).toContain('buttonVariant={canShareFiles ? "default" : "outline"}')
    expect(source).toContain('variant={canShareFiles ? "outline" : "default"}')
  })
})
