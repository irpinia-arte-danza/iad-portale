// ─────────────────────────────────────────────────────────────────────────
// Il tema del portale: scuro per tutti, chiaro a scelta dal menu utente.
//
// La scelta la salva next-themes in localStorage (chiave "theme"). Il server
// non la conosce: l'<html> esce dal server già con la classe "dark", e lo
// script di next-themes, prima che la pagina si disegni, la cambia in
// "light" solo se l'utente ha scelto chiaro. Niente flash bianco.
//
// Le pagine di accesso (login, password, secondo fattore) restano scure
// anche per chi ha scelto chiaro: il menu utente lì non c'è.
//
// Email e PDF delle ricevute non passano di qui: restano chiari.
// ─────────────────────────────────────────────────────────────────────────

export type PortalTheme = "dark" | "light"

export const THEME_STORAGE_KEY = "theme"
export const DEFAULT_THEME: PortalTheme = "dark"

// Le props di next-themes, in un posto solo (le legge il test)
export const THEME_PROVIDER_PROPS = {
  attribute: "class",
  defaultTheme: DEFAULT_THEME,
  enableSystem: false,
  themes: ["dark", "light"],
  storageKey: THEME_STORAGE_KEY,
  disableTransitionOnChange: true,
} as const

// Il colore della barra di Safari (iPad, iPhone) e di Chrome su Android:
// lo sfondo della pagina, --background in globals.css
export const THEME_COLORS: Record<PortalTheme, string> = {
  dark: "#0a0a0a",
  light: "#ffffff",
}

const AUTH_PAGES = [
  "/login",
  "/password-dimenticata",
  "/accesso-non-attivo",
  "/imposta-password",
  "/imposta-2fa",
  "/verifica-2fa",
] as const

export function forcedThemeFor(pathname: string | null): PortalTheme | undefined {
  if (!pathname) return undefined
  return (AUTH_PAGES as readonly string[]).includes(pathname) ? "dark" : undefined
}

// Allinea meta color-scheme e theme-color alla classe che next-themes ha
// appena messo sull'<html>. Gira subito dopo il suo script, prima del
// disegno; poi ci pensa ThemeMeta a ogni cambio.
export const THEME_META_SCRIPT = `(function(){try{var l=document.documentElement.classList.contains("light");var s=l?"light":"dark";var c=l?"${THEME_COLORS.light}":"${THEME_COLORS.dark}";var m=document.querySelector('meta[name="color-scheme"]');if(m)m.setAttribute("content",s);var t=document.querySelector('meta[name="theme-color"]');if(t)t.setAttribute("content",c)}catch(e){}})()`

// Prima del tema nuovo il menu offriva anche «Sistema»: chi l'aveva scelto
// ha "system" salvato, che con enableSystem=false next-themes metterebbe
// tale e quale come classe (pagina chiara). Si toglie prima che lo legga:
// gira nell'<head>, prima dello script di next-themes, e vale il default.
export const THEME_STORAGE_CLEANUP_SCRIPT = `(function(){try{var v=localStorage.getItem("${THEME_STORAGE_KEY}");if(v!==null&&v!=="dark"&&v!=="light")localStorage.removeItem("${THEME_STORAGE_KEY}")}catch(e){}})()`
