import { readdir } from "node:fs/promises"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  ADMIN_NAV,
  ADMIN_NAV_ITEMS,
  isNavItemActive,
} from "./admin-nav"

const ADMIN_DIR = join(process.cwd(), "src/app/(admin)/admin")

// Cartelle che non sono pagine: componenti condivisi fra le sezioni
const NOT_A_PAGE = new Set(["_components"])

// `reports` raccoglie tre pagine (corrispettivi, bilancio, export annuale):
// la voce di sidebar sta un livello più in basso
const NESTED = new Set(["reports"])

async function firstLevelRoutes(): Promise<string[]> {
  const entries = await readdir(ADMIN_DIR, { withFileTypes: true })
  return entries
    .filter((e) => e.isDirectory() && !NOT_A_PAGE.has(e.name))
    .map((e) => e.name)
    .sort()
}

describe("ADMIN_NAV", () => {
  it("non ha gruppi vuoti", () => {
    for (const group of ADMIN_NAV) {
      expect(group.items.length, `gruppo ${group.label ?? "(senza nome)"}`).toBeGreaterThan(0)
    }
  })

  it("non ha href ripetuti", () => {
    const hrefs = ADMIN_NAV_ITEMS.map((i) => i.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it("non ha etichette ripetute", () => {
    const labels = ADMIN_NAV_ITEMS.map((i) => i.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it("ogni href sta sotto /admin/", () => {
    for (const item of ADMIN_NAV_ITEMS) {
      expect(item.href.startsWith("/admin/")).toBe(true)
    }
  })

  it("un solo gruppo in fondo, ed è l'ultimo", () => {
    const atBottom = ADMIN_NAV.filter((g) => g.atBottom)
    expect(atBottom).toHaveLength(1)
    expect(ADMIN_NAV.at(-1)?.atBottom).toBe(true)
  })

  it("solo la dashboard usa la corrispondenza esatta", () => {
    const exact = ADMIN_NAV_ITEMS.filter((i) => i.exact)
    expect(exact.map((i) => i.href)).toEqual(["/admin/dashboard"])
  })

  it("ordine dei gruppi come concordato", () => {
    expect(ADMIN_NAV.map((g) => g.label)).toEqual([
      null,
      "Persone",
      "Attività",
      "Incassi",
      "Amministrazione",
      null,
    ])
  })
})

describe("nessuna pagina resta fuori dalla sidebar", () => {
  it("ogni cartella di primo livello ha almeno una voce", async () => {
    const routes = await firstLevelRoutes()
    const senzaVoce = routes.filter((route) => {
      const prefix = `/admin/${route}`
      return !ADMIN_NAV_ITEMS.some(
        (item) => item.href === prefix || item.href.startsWith(`${prefix}/`),
      )
    })
    expect(senzaVoce).toEqual([])
  })

  it("reports ha tre voci, una per pagina", async () => {
    const nested = await readdir(join(ADMIN_DIR, "reports"), {
      withFileTypes: true,
    })
    const pagine = nested.filter((e) => e.isDirectory()).map((e) => e.name)
    const voci = ADMIN_NAV_ITEMS.filter((i) =>
      i.href.startsWith("/admin/reports/"),
    )
    expect(voci).toHaveLength(pagine.length)
    expect(voci).toHaveLength(3)
  })

  it("ogni voce punta a una cartella che esiste", async () => {
    const routes = new Set(await firstLevelRoutes())
    for (const item of ADMIN_NAV_ITEMS) {
      const first = item.href.replace("/admin/", "").split("/")[0]
      expect(routes.has(first), `${item.href} non ha una cartella`).toBe(true)
      if (NESTED.has(first)) {
        const nested = await readdir(join(ADMIN_DIR, first), {
          withFileTypes: true,
        })
        const second = item.href.replace(`/admin/${first}/`, "")
        expect(
          nested.some((e) => e.isDirectory() && e.name === second),
          `${item.href} non ha una sottocartella`,
        ).toBe(true)
      }
    }
  })
})

describe("isNavItemActive", () => {
  const allieve = { href: "/admin/athletes", label: "Allieve", icon: {} as never }
  const dashboard = {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: {} as never,
    exact: true,
  }

  it("la voce resta accesa nelle sottopagine", () => {
    expect(isNavItemActive(allieve, "/admin/athletes")).toBe(true)
    expect(isNavItemActive(allieve, "/admin/athletes/abc-123")).toBe(true)
  })

  it("non si accende su un percorso che somiglia", () => {
    expect(isNavItemActive(allieve, "/admin/athletes-old")).toBe(false)
  })

  it("la dashboard si accende solo su se stessa", () => {
    expect(isNavItemActive(dashboard, "/admin/dashboard")).toBe(true)
    expect(isNavItemActive(dashboard, "/admin/dashboard/altro")).toBe(false)
  })

  it("Pagamenti e Scadenze non si accendono a vicenda", () => {
    const pagamenti = ADMIN_NAV_ITEMS.find((i) => i.href === "/admin/payments")!
    const scadenze = ADMIN_NAV_ITEMS.find((i) => i.href === "/admin/scadenze")!
    expect(isNavItemActive(pagamenti, "/admin/scadenze")).toBe(false)
    expect(isNavItemActive(scadenze, "/admin/payments")).toBe(false)
  })
})
