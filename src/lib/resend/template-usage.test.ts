import { describe, expect, it } from "vitest"

import {
  ACCESS_TEMPLATE_SLUG,
  CERT_REMINDER_TEMPLATE_SLUG,
  RECEIPT_EMAIL_TEMPLATE_SLUG,
  STAGE_INVITE_TEMPLATE_SLUG,
  templateUsage,
} from "./template-usage"

describe("templateUsage", () => {
  it("i solleciti e i promemoria si scelgono in Scadenze › Sollecita", () => {
    expect(
      templateUsage({ slug: "sollecito-scadenza", category: "SOLLECITO" }),
    ).toBe("Scadenze › Sollecita")
    expect(
      templateUsage({ slug: "promemoria-scadenza", category: "PROMEMORIA" }),
    ).toBe("Scadenze › Sollecita")
  })

  it("un sollecito scritto da Giuseppina, con uno slug nuovo, vale lo stesso", () => {
    expect(
      templateUsage({ slug: "sollecito-gentile", category: "SOLLECITO" }),
    ).toBe("Scadenze › Sollecita")
  })

  it("i modelli con un invio preciso dicono quale", () => {
    expect(
      templateUsage({ slug: RECEIPT_EMAIL_TEMPLATE_SLUG, category: "CONFERMA" }),
    ).toBe("Ricevute › Consegna")
    expect(
      templateUsage({
        slug: STAGE_INVITE_TEMPLATE_SLUG,
        category: "COMUNICAZIONE",
      }),
    ).toBe("Stage › Invita allieve")
    expect(
      templateUsage({ slug: ACCESS_TEMPLATE_SLUG, category: "BENVENUTO" }),
    ).toBe("Genitori e Insegnanti › Invia accesso")
  })

  it("lo slug vince sulla categoria: il promemoria del certificato non è in Scadenze", () => {
    expect(
      templateUsage({
        slug: CERT_REMINDER_TEMPLATE_SLUG,
        category: "PROMEMORIA",
      }),
    ).toBe("Certificati › Chiedi al genitore (in scadenza o scaduto)")
  })

  it("un modello che nessun invio usa lo dice: null", () => {
    expect(
      templateUsage({ slug: "benvenuto-iscrizione", category: "BENVENUTO" }),
    ).toBeNull()
    expect(
      templateUsage({ slug: "conferma-pagamento", category: "CONFERMA" }),
    ).toBeNull()
  })
})
