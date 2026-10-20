import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import {
  DEFAULT_THEME,
  forcedThemeFor,
  THEME_COLORS,
  THEME_PROVIDER_PROPS,
  THEME_STORAGE_CLEANUP_SCRIPT,
} from "./theme-config"

// Niente browser qui: si prendono gli script veri che il server mette nella
// pagina (pulizia nell'<head>, next-themes, meta) e si eseguono, in ordine,
// su un documento finto che parte dalla classe del server render.

const path = { current: "/parent/dashboard" }
vi.mock("next/navigation", () => ({ usePathname: () => path.current }))

const { ThemeProvider } = await import("@/components/theme-provider")

function bootScripts(): string[] {
  const html = renderToStaticMarkup(<ThemeProvider>contenuto</ThemeProvider>)
  const bodyScripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1])
  return [THEME_STORAGE_CLEANUP_SCRIPT, ...bodyScripts]
}

function load(stored: string | null) {
  const storage = new Map<string, string>()
  if (stored !== null) storage.set(THEME_PROVIDER_PROPS.storageKey, stored)
  const localStorage = {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => void storage.set(k, v),
    removeItem: (k: string) => void storage.delete(k),
  }
  // Come esce dal server (layout.tsx): classe e color-scheme di default
  const classes = new Set<string>(["font", DEFAULT_THEME])
  const metas: Record<string, string> = {
    "color-scheme": DEFAULT_THEME,
    "theme-color": THEME_COLORS[DEFAULT_THEME],
  }
  const documentElement = {
    classList: {
      add: (...c: string[]) => c.forEach((x) => classes.add(x)),
      remove: (...c: string[]) => c.forEach((x) => classes.delete(x)),
      contains: (c: string) => classes.has(c),
    },
    setAttribute: () => {},
    style: {} as Record<string, string>,
  }
  const document = {
    documentElement,
    querySelector: (selector: string) => {
      const name = /name="([^"]+)"/.exec(selector)?.[1]
      return name && name in metas
        ? { setAttribute: (_: string, v: string) => void (metas[name] = v) }
        : null
    },
  }
  const window = { matchMedia: () => ({ matches: false }) }
  for (const script of bootScripts()) {
    new Function("document", "localStorage", "window", script)(document, localStorage, window)
  }
  return { classes, metas, colorScheme: documentElement.style.colorScheme, storage }
}

describe("tema: scuro di default, chiaro a scelta", () => {
  it("next-themes configurato senza tema di sistema, default scuro", () => {
    expect(DEFAULT_THEME).toBe("dark")
    expect(THEME_PROVIDER_PROPS).toMatchObject({
      attribute: "class",
      defaultTheme: "dark",
      enableSystem: false,
      storageKey: "theme",
    })
  })

  it("nessuna preferenza salvata → classe dark, meta scuri", () => {
    path.current = "/parent/dashboard"
    const page = load(null)
    expect(page.classes.has("dark")).toBe(true)
    expect(page.classes.has("light")).toBe(false)
    expect(page.colorScheme).toBe("dark")
    expect(page.metas).toEqual({ "color-scheme": "dark", "theme-color": "#0a0a0a" })
  })

  it("preferenza «light» salvata → classe light, meta chiari", () => {
    path.current = "/parent/dashboard"
    const page = load("light")
    expect(page.classes.has("light")).toBe(true)
    expect(page.classes.has("dark")).toBe(false)
    expect(page.colorScheme).toBe("light")
    expect(page.metas).toEqual({ "color-scheme": "light", "theme-color": "#ffffff" })
  })

  it("«system» rimasto dal vecchio menu → si torna allo scuro", () => {
    path.current = "/admin/dashboard"
    const page = load("system")
    expect(page.classes.has("dark")).toBe(true)
    expect(page.classes.has("system")).toBe(false)
    expect(page.storage.has("theme")).toBe(false)
  })

  it("le pagine di accesso restano scure anche con «light» salvato, senza toccare la scelta", () => {
    path.current = "/login"
    const page = load("light")
    expect(page.classes.has("dark")).toBe(true)
    expect(page.classes.has("light")).toBe(false)
    expect(page.storage.get("theme")).toBe("light")
  })

  it("quali pagine sono «di accesso»", () => {
    for (const p of ["/login", "/password-dimenticata", "/imposta-password", "/verifica-2fa", "/imposta-2fa"]) {
      expect(forcedThemeFor(p), p).toBe("dark")
    }
    for (const p of ["/admin/dashboard", "/parent/dashboard", "/teacher/dashboard", "/tessere", "/privacy"]) {
      expect(forcedThemeFor(p), p).toBeUndefined()
    }
  })
})
