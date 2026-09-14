// Validazione del parametro "next" (redirect post-login / post-link email).
// Il valore arriva dall'URL ed è quindi controllabile da chiunque: accettiamo
// solo percorsi relativi dello stesso sito. Rifiutati: "//sito-esterno"
// (protocol-relative), "/\sito-esterno" (backslash normalizzato dai browser),
// URL assoluti, caratteri di controllo e spazi. Opzionale allow-list di
// prefissi (es. l'area del ruolo: "/parent").

const PARSE_BASE = "http://localhost"
const MAX_LENGTH = 512

function hasUnsafeCharacters(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code <= 0x20 || code === 0x7f || value[i] === "\\") return true
  }
  return false
}

export function safeNextPath(
  next: string | null | undefined,
  fallback: string,
  allowedPrefixes?: readonly string[],
): string {
  if (typeof next !== "string" || next.length === 0 || next.length > MAX_LENGTH) {
    return fallback
  }
  if (!next.startsWith("/") || next.startsWith("//")) return fallback
  if (hasUnsafeCharacters(next)) return fallback

  let url: URL
  try {
    url = new URL(next, PARSE_BASE)
  } catch {
    return fallback
  }
  if (url.origin !== PARSE_BASE) return fallback

  if (
    allowedPrefixes &&
    !allowedPrefixes.some(
      (prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
    )
  ) {
    return fallback
  }

  return `${url.pathname}${url.search}${url.hash}`
}
