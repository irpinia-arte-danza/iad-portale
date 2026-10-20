import { describe, expect, it } from "vitest"

import {
  CONFIRM_ONCE_SCRIPT,
  confirmButtonLabel,
  confirmPageHtml,
  isConfirmType,
} from "./confirm-page"

const base = {
  tokenHash: "abc123",
  intent: null,
  next: null,
  asdName: "IAD",
}

describe("pagina di conferma del link personale", () => {
  it("accetta solo invite e recovery", () => {
    expect(isConfirmType("invite")).toBe(true)
    expect(isConfirmType("recovery")).toBe(true)
    expect(isConfirmType("magiclink")).toBe(false)
    expect(isConfirmType("signup")).toBe(false)
    expect(isConfirmType("email_change")).toBe(false)
    expect(isConfirmType(null)).toBe(false)
  })

  it("il tasto dice cosa succede", () => {
    expect(confirmButtonLabel("invite", null)).toBe("Attiva il mio accesso")
    expect(confirmButtonLabel("recovery", "access")).toBe("Attiva il mio accesso")
    expect(confirmButtonLabel("recovery", null)).toBe("Imposta la nuova password")
  })

  it("la GET non consuma niente: un modulo POST con i campi nascosti, nessun invio automatico", () => {
    const html = confirmPageHtml({ ...base, type: "invite" })
    expect(html).toContain('<form method="post" action="/auth/confirm" id="confirm">')
    expect(html).toContain('<input type="hidden" name="token_hash" value="abc123">')
    expect(html).toContain('<input type="hidden" name="type" value="invite">')
    expect(html).toContain('<button type="submit">Attiva il mio accesso</button>')
    // L'unico script è quello che blocca il secondo invio
    expect(html.match(/<script/g)).toHaveLength(1)
    expect(html).toContain(`<script>${CONFIRM_ONCE_SCRIPT}</script>`)
    expect(CONFIRM_ONCE_SCRIPT).not.toMatch(/\.submit\(|requestSubmit|fetch\(/)
  })

  it("pagina scura, come il login", () => {
    const html = confirmPageHtml({ ...base, type: "invite" })
    expect(html).toContain('<meta name="color-scheme" content="dark">')
    expect(html).toContain('<meta name="theme-color" content="#0a0a0a">')
  })

  it("intent e next passano solo se presenti, e con l'escape", () => {
    const html = confirmPageHtml({
      ...base,
      type: "recovery",
      intent: "access",
      next: '/parent/x"><script>alert(1)</script>',
      asdName: "A&B <danza>",
    })
    expect(html).toContain('name="intent" value="access"')
    expect(html).toContain(
      'name="next" value="/parent/x&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;"',
    )
    expect(html.match(/<script/g)).toHaveLength(1)
    expect(html).toContain("A&amp;B &lt;danza&gt;")
  })
})

// Lo script eseguito su un modulo finto: due tap → un solo invio
describe("doppio tap su «Attiva il mio accesso»", () => {
  function fakePage() {
    const listeners: Array<(e: { preventDefault: () => void }) => void> = []
    const button = { disabled: false, textContent: "Attiva il mio accesso" }
    const form = {
      dataset: {} as Record<string, string>,
      addEventListener: (_: string, fn: (e: { preventDefault: () => void }) => void) => {
        listeners.push(fn)
      },
      querySelector: () => button,
    }
    const document = { getElementById: (id: string) => (id === "confirm" ? form : null) }
    const timers: Array<() => void> = []
    const setTimeout = (fn: () => void) => {
      timers.push(fn)
    }
    new Function("document", "setTimeout", CONFIRM_ONCE_SCRIPT)(document, setTimeout)
    const submit = () => {
      let prevented = false
      listeners.forEach((fn) => fn({ preventDefault: () => (prevented = true) }))
      return prevented ? "annullato" : "inviato"
    }
    return { button, submit, flush: () => timers.splice(0).forEach((fn) => fn()) }
  }

  it("il primo invio parte, il secondo no, il tasto si spegne", () => {
    const page = fakePage()
    expect(page.submit()).toBe("inviato")
    expect(page.submit()).toBe("annullato")
    page.flush()
    expect(page.button.disabled).toBe(true)
    expect(page.button.textContent).toBe("Attendi…")
    expect(page.submit()).toBe("annullato")
  })
})
