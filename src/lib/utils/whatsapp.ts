// Link a WhatsApp Web con il numero in formato internazionale, come già fa
// la scheda del genitore: l'integrazione vera con le API non c'è, si apre la
// chat e si scrive a mano.
export function whatsappHref(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D+/g, "")
  if (digits.length === 0) return null
  const international = digits.startsWith("00")
    ? digits.slice(2)
    : digits.startsWith("39")
      ? digits
      : `39${digits}`
  return `https://wa.me/${international}`
}
