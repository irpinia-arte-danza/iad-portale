// ─────────────────────────────────────────────────────────────────────────
// Quando un accesso admin merita un'email. Funzioni pure, testate.
//
// Un'email a ogni login diventerebbe rumore: si avvisa solo per un
// dispositivo nuovo, un paese diverso dall'Italia, cinque tentativi falliti
// in dieci minuti (una sola email, al quinto) e l'azzeramento del secondo
// fattore (deciso altrove, non c'è niente da calcolare).
// ─────────────────────────────────────────────────────────────────────────

export const HOME_COUNTRY = "IT"

export const FAILURE_ALERT_THRESHOLD = 5
export const FAILURE_ALERT_WINDOW_MINUTES = 10

export const ADMIN_LOGIN_RETENTION_DAYS = 90

export type LoginAnomaly = "new-device" | "foreign-country"

export function loginAnomalies(input: {
  newDevice: boolean
  // ISO alpha-2; null = header assente (locale, o Vercel che non lo manda):
  // non si può dire che sia estero, e non si avvisa
  country: string | null
}): LoginAnomaly[] {
  const anomalies: LoginAnomaly[] = []
  if (input.newDevice) anomalies.push("new-device")
  if (input.country && input.country.toUpperCase() !== HOME_COUNTRY) {
    anomalies.push("foreign-country")
  }
  return anomalies
}

/**
 * Vero solo nel momento in cui i fallimenti nella finestra arrivano ESATTAMENTE
 * alla soglia: il quinto manda l'email, il sesto no. I tentativi successivi
 * sono comunque «bloccati» per 15 minuti (login_attempts), quindi la finestra
 * si svuota prima che possa scattare di nuovo.
 */
export function failureAlertDue(failureTimes: Date[], now: Date): boolean {
  const since = now.getTime() - FAILURE_ALERT_WINDOW_MINUTES * 60_000
  const inWindow = failureTimes.filter((t) => t.getTime() >= since).length
  return inWindow === FAILURE_ALERT_THRESHOLD
}

export function adminLoginCutoff(now: Date): Date {
  return new Date(now.getTime() - ADMIN_LOGIN_RETENTION_DAYS * 86_400_000)
}
