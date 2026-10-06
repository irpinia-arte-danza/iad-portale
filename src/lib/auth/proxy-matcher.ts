import type { UserRole } from "@prisma/client"

import { getDashboardPath, getRoleAreaPrefix } from "./dashboard-path"

// ─────────────────────────────────────────────────────────────────────────
// Quali richieste passano dal proxy, e chi può stare in quale area.
//
// Il matcher di Next deve essere una stringa letterale dentro src/proxy.ts
// (il config del proxy viene letto staticamente al build): qui c'è la stessa
// stringa, con una funzione che la applica e un test che la verifica. Il
// test controlla anche che le due copie coincidano.
//
// Prima il matcher escludeva «qualsiasi percorso con un punto»: comodo per
// i file statici, ma /admin/stages/abc. non passava dal proxy. Adesso si
// escludono solo le estensioni dei file statici che il sito serve davvero.
// ─────────────────────────────────────────────────────────────────────────

export const STATIC_EXTENSIONS = [
  "ico",
  "png",
  "svg",
  "jpg",
  "jpeg",
  "webp",
  "css",
  "js",
  "txt",
  "xml",
  "woff2",
] as const

// Copia identica di `config.matcher[0]` in src/proxy.ts
export const PROXY_MATCHER = `/((?!_next|api|.*\\.(?:${STATIC_EXTENSIONS.join("|")})$).*)`

// Il matcher di Next usa la sintassi di path-to-regexp: `/((?!…).*)` è un
// gruppo con lookahead negativo ancorato all'inizio del percorso
const PROXIED = new RegExp(
  `^/(?!_next|api|.*\\.(?:${STATIC_EXTENSIONS.join("|")})$).*$`,
)

export function isProxiedPath(pathname: string): boolean {
  return PROXIED.test(pathname)
}

// Le aree riservate per ruolo. Un utente autenticato che chiede l'area di
// un altro ruolo va rimandato alla propria dashboard: le pagine e le query
// lo rifiuterebbero comunque, ma il proxy è il primo posto dove si vede.
const ROLE_AREAS = ["/admin", "/teacher", "/parent"] as const

export function areaOf(pathname: string): (typeof ROLE_AREAS)[number] | null {
  return (
    ROLE_AREAS.find(
      (area) => pathname === area || pathname.startsWith(`${area}/`),
    ) ?? null
  )
}

// Dove mandare chi è nell'area sbagliata; null se è al posto giusto o se il
// percorso non è un'area riservata
export function wrongAreaRedirect(pathname: string, role: UserRole): string | null {
  const area = areaOf(pathname)
  if (!area) return null
  return area === getRoleAreaPrefix(role) ? null : getDashboardPath(role)
}
