// Le pagine che si aprono senza accesso. Le legge il proxy per decidere chi
// mandare al login; stanno qui, fuori dal proxy, per poterle verificare con
// un test — una pagina legale che finisce dietro il login è un errore che
// non si vede finché non ci prova un genitore.
export const PUBLIC_PATHS = [
  "/",
  "/login",
  "/password-dimenticata",
  "/accesso-non-attivo",
  "/privacy",
] as const

// Path interni gestiti senza session (es. callback OAuth crea la session)
export const PUBLIC_PREFIXES = ["/auth/"] as const

export function isPublicPath(pathname: string): boolean {
  if ((PUBLIC_PATHS as readonly string[]).includes(pathname)) return true
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}
