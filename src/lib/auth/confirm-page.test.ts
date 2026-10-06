import { describe, expect, it } from "vitest"

import {
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

  it("la GET non consuma niente: un modulo POST con i campi nascosti, nessuno script", () => {
    const html = confirmPageHtml({ ...base, type: "invite" })
    expect(html).toContain('<form method="post" action="/auth/confirm">')
    expect(html).toContain('<input type="hidden" name="token_hash" value="abc123">')
    expect(html).toContain('<input type="hidden" name="type" value="invite">')
    expect(html).not.toContain("<script")
    expect(html).toContain('<button type="submit">Attiva il mio accesso</button>')
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
    expect(html).not.toContain("<script>")
    expect(html).toContain("A&amp;B &lt;danza&gt;")
  })
})
