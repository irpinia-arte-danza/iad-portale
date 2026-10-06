// ─────────────────────────────────────────────────────────────────────────
// In fondo all'email di invito c'è sempre il link all'informativa privacy.
//
// Il testo dell'invito è un modello modificabile da /admin/email-templates,
// e quello salvato oggi non conosce {link_privacy}. Invece di correggere il
// modello nel database, il link si aggiunge qui dopo il rendering, se il
// modello non lo contiene già: così c'è sia col testo predefinito sia con
// uno personalizzato, e chi vuole spostarlo nel corpo scrive {link_privacy}
// nel modello e il piè di pagina non si raddoppia.
// ─────────────────────────────────────────────────────────────────────────

export const PRIVACY_FOOTER_LABEL = "Informativa privacy"

export type EmailBody = { html: string; text: string }

export function withPrivacyFooter(body: EmailBody, privacyUrl: string): EmailBody {
  const html = body.html.includes(privacyUrl)
    ? body.html
    : `${body.html}\n<p><small><a href="${privacyUrl}">${PRIVACY_FOOTER_LABEL}</a></small></p>`
  const text = body.text.includes(privacyUrl)
    ? body.text
    : `${body.text}\n${PRIVACY_FOOTER_LABEL}: ${privacyUrl}`
  return { html, text }
}
