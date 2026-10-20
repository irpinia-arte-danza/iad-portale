// ─────────────────────────────────────────────────────────────────────────
// Chi è entrato con un link personale deve scegliere la password prima di
// usare il portale.
//
// Il caso che lo ha reso necessario (#60, referente in produzione): due tap
// su «Attiva il mio accesso». Il primo POST consuma il token e salva i
// cookie di sessione; il secondo trova il token già usato e mostra «link non
// valido». Al ricaricamento la sessione c'è: l'utente era dentro senza
// password. Il redirect del POST non basta: la regola sta qui, e la
// applicano il proxy e le guardie requireXxx().
//
// Il flag è in app_metadata, non in user_metadata: user_metadata lo può
// scrivere l'utente stesso con la sua sessione (updateUser dal browser),
// app_metadata solo la service role. Lo scrive solo setOwnPassword.
//
// Gli utenti di prima del flag non ce l'hanno: chi è entrato con la
// password (amr "password" nel JWT) una password ce l'ha per forza, e passa.
// Resta fermo solo chi ha una sessione nata da un link e non ha mai scelto
// la password da /imposta-password.
// ─────────────────────────────────────────────────────────────────────────

export const PASSWORD_SET_KEY = "password_set"
export const SET_PASSWORD_PATH = "/imposta-password"

// Le pagine che chi deve ancora scegliere la password può aprire: quella
// della password, le route /auth/* (conferma del link, uscita) e le pagine
// che non chiedono niente all'account. Tutto il resto (aree, secondo
// fattore, login, password dimenticata) porta a /imposta-password.
const ALLOWED_PATHS = [SET_PASSWORD_PATH, "/accesso-non-attivo", "/privacy"] as const
const ALLOWED_PREFIXES = ["/auth/"] as const

export function passwordGateExempt(pathname: string): boolean {
  if ((ALLOWED_PATHS as readonly string[]).includes(pathname)) return true
  return ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

type GateUser = { app_metadata?: unknown } | null | undefined

function metadataSaysSet(user: GateUser): boolean {
  const meta = user?.app_metadata
  if (!meta || typeof meta !== "object") return false
  return (meta as Record<string, unknown>)[PASSWORD_SET_KEY] === true
}

function signedInWithPassword(claims: unknown): boolean {
  if (!claims || typeof claims !== "object") return false
  const amr = (claims as { amr?: unknown }).amr
  if (!Array.isArray(amr)) return false
  return amr.some(
    (entry: unknown) =>
      !!entry &&
      typeof entry === "object" &&
      (entry as { method?: unknown }).method === "password",
  )
}

// true = va mandato a /imposta-password. Senza utente non decide niente:
// l'anonimo lo gestiscono il proxy e le guardie.
export function needsPassword(user: GateUser, claims: unknown): boolean {
  if (!user) return false
  if (metadataSaysSet(user)) return false
  return !signedInWithPassword(claims)
}
