// Il testo del sollecito per WhatsApp: lo stesso del modello email, in
// chiaro. I modelli hanno un corpo testuale (`bodyText`) proprio per questo;
// dove manca, si ricava dall'HTML togliendo i tag, perché un messaggio
// WhatsApp con dentro <p> non si può mandare.
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&euro;/g, "€")
    // Entità numeriche (&#8364; per l'euro, gli accenti di certi editor)
    .replace(/&#(\d+);/g, (_m, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function reminderWhatsappText(rendered: {
  bodyText: string | null
  bodyHtml: string
}): string {
  const text = rendered.bodyText?.trim()
  return text && text.length > 0 ? text : htmlToPlainText(rendered.bodyHtml)
}
