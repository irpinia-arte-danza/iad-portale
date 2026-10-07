// L'unico modo di distinguere un iPad da un Mac, dal 2019: lo schermo touch.
// Si calcola nel browser e viaggia con il modulo di accesso; il server lo
// passa a describeUserAgent (user-agent.ts).
export function touchMacHint(): boolean {
  if (typeof navigator === "undefined") return false
  const platform = navigator.platform ?? ""
  return navigator.maxTouchPoints > 1 && /Mac/i.test(platform)
}
