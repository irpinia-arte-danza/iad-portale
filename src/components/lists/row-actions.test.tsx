import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { RowActionsCard, splitCardActions, type RowAction } from "./row-actions"

const noop = () => undefined

const ACTIONS: RowAction[] = [
  { key: "collect", label: "Incassa", href: "/admin/athletes/x", primary: true, cardOnly: true },
  { key: "edit", label: "Modifica", onSelect: noop },
  { key: "access", label: "Invia accesso (manca l'email)", disabled: true, onSelect: noop },
  { key: "delete", label: "Sposta nel cestino", destructive: true, onSelect: noop },
]

describe("splitCardActions", () => {
  it("un solo tasto principale, il resto nel menu", () => {
    const { primary, rest } = splitCardActions(ACTIONS)
    expect(primary?.key).toBe("collect")
    expect(rest.map((a) => a.key)).toEqual(["edit", "delete"])
  })

  it("le voci spente in card non compaiono", () => {
    const { rest } = splitCardActions(ACTIONS)
    expect(rest.some((a) => a.disabled)).toBe(false)
  })

  it("con due «primary» vince la prima; senza, solo menu", () => {
    const two = splitCardActions([
      { key: "a", label: "A", primary: true, onSelect: noop },
      { key: "b", label: "B", primary: true, onSelect: noop },
    ])
    expect(two.primary?.key).toBe("a")
    expect(two.rest.map((a) => a.key)).toEqual(["b"])
    expect(splitCardActions(ACTIONS.slice(1)).primary).toBeNull()
  })

  it("un tasto principale spento non diventa il tasto della card", () => {
    const { primary } = splitCardActions([
      { key: "a", label: "A", primary: true, disabled: true, onSelect: noop },
      { key: "b", label: "B", onSelect: noop },
    ])
    expect(primary).toBeNull()
  })
})

describe("RowActionsCard", () => {
  it("mostra un tasto e il menu «…» da 44 px, mai «Sposta nel cestino» a tutta larghezza", () => {
    const html = renderToStaticMarkup(<RowActionsCard actions={ACTIONS} label="Azioni" />)
    expect(html.match(/<a /g)).toHaveLength(1)
    expect(html).toContain("Incassa")
    expect(html).toContain("flex-1")
    // Il menu è chiuso: le sue voci non sono nel markup
    expect(html).not.toContain("Sposta nel cestino")
    expect(html).toContain('aria-label="Azioni"')
    expect(html).toContain("size-11")
  })

  it("senza tasto principale resta il solo menu, marcato per stare nell'angolo della card", () => {
    const html = renderToStaticMarkup(<RowActionsCard actions={ACTIONS.slice(1)} />)
    expect(html).toContain("data-row-menu-only")
    expect(html).not.toContain("flex-1")
  })

  it("inline: il tasto è compatto e la card lo tiene accanto al nome", () => {
    const html = renderToStaticMarkup(<RowActionsCard actions={ACTIONS} inline />)
    expect(html).toContain("data-row-actions-inline")
    expect(html).not.toContain("flex-1")
    expect(html).toContain("Incassa")
  })

  it("niente azioni, niente markup", () => {
    expect(renderToStaticMarkup(<RowActionsCard actions={[]} />)).toBe("")
  })
})
