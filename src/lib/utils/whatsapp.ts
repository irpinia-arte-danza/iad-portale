// Link a WhatsApp Web, con il numero in formato internazionale e il testo già
// scritto. Il gestionale non invia niente: apre la chat, il messaggio lo manda
// Giuseppina. Stessa normalizzazione del numero che fa la scheda del genitore.
export function whatsappNumber(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D+/g, "")
  if (digits.length === 0) return null
  if (digits.startsWith("00")) return digits.slice(2)
  if (digits.startsWith("39")) return digits
  return `39${digits}`
}

export function whatsappHref(
  phone: string | null | undefined,
  text?: string | null,
): string | null {
  const number = whatsappNumber(phone)
  if (!number) return null
  const body = text?.trim()
  // encodeURIComponent e non URLSearchParams: wa.me vuole gli spazi come %20,
  // non come "+", altrimenti nel messaggio compaiono i più
  return body
    ? `https://wa.me/${number}?text=${encodeURIComponent(body)}`
    : `https://wa.me/${number}`
}
