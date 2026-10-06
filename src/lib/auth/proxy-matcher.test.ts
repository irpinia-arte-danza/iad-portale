import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import {
  areaOf,
  isProxiedPath,
  PROXY_MATCHER,
  wrongAreaRedirect,
} from "./proxy-matcher"

describe("matcher del proxy", () => {
  it("è lo stesso letterale scritto in src/proxy.ts", () => {
    const source = readFileSync(
      path.resolve(__dirname, "../../proxy.ts"),
      "utf8",
    )
    // Nel sorgente la stringa è un letterale con le backslash raddoppiate
    expect(source).toContain(JSON.stringify(PROXY_MATCHER))
  })

  it("un percorso con un punto dentro passa dal proxy", () => {
    expect(isProxiedPath("/admin/stages/abc.")).toBe(true)
    expect(isProxiedPath("/parent/dashboard")).toBe(true)
    expect(isProxiedPath("/ricevute/abc.def")).toBe(true)
    expect(isProxiedPath("/admin/athletes/x.y/page")).toBe(true)
    expect(isProxiedPath("/")).toBe(true)
    expect(isProxiedPath("/privacy")).toBe(true)
  })

  it("i file statici e le API no", () => {
    expect(isProxiedPath("/favicon.ico")).toBe(false)
    expect(isProxiedPath("/robots.txt")).toBe(false)
    expect(isProxiedPath("/sitemap.xml")).toBe(false)
    expect(isProxiedPath("/placeholder-logo.svg")).toBe(false)
    expect(isProxiedPath("/img/logo.png")).toBe(false)
    expect(isProxiedPath("/fonts/geist.woff2")).toBe(false)
    expect(isProxiedPath("/_next/static/chunks/a.js")).toBe(false)
    expect(isProxiedPath("/api/cron/reminders")).toBe(false)
  })

  it("un'estensione sconosciuta non basta a saltare il proxy", () => {
    expect(isProxiedPath("/admin/report.pdf")).toBe(true)
    expect(isProxiedPath("/admin/x.html")).toBe(true)
  })
})

describe("area per ruolo", () => {
  it("riconosce le tre aree, non i prefissi parziali", () => {
    expect(areaOf("/admin")).toBe("/admin")
    expect(areaOf("/admin/athletes/1")).toBe("/admin")
    expect(areaOf("/administration")).toBeNull()
    expect(areaOf("/parents")).toBeNull()
    expect(areaOf("/privacy")).toBeNull()
  })

  it("chi è nell'area sbagliata va alla propria dashboard", () => {
    expect(wrongAreaRedirect("/admin/stages", "PARENT")).toBe("/parent/dashboard")
    expect(wrongAreaRedirect("/admin/stages", "TEACHER")).toBe("/teacher/dashboard")
    expect(wrongAreaRedirect("/parent/dashboard", "ADMIN")).toBe("/admin/dashboard")
    expect(wrongAreaRedirect("/teacher/courses/1", "PARENT")).toBe("/parent/dashboard")
  })

  it("chi è al posto giusto resta; l'allieva con accesso proprio sta in /parent", () => {
    expect(wrongAreaRedirect("/admin/stages", "ADMIN")).toBeNull()
    expect(wrongAreaRedirect("/parent/stages", "PARENT")).toBeNull()
    expect(wrongAreaRedirect("/parent/dashboard", "ATHLETE")).toBeNull()
    expect(wrongAreaRedirect("/admin/x", "ATHLETE")).toBe("/parent/dashboard")
  })

  it("fuori dalle aree riservate il ruolo non conta", () => {
    expect(wrongAreaRedirect("/privacy", "PARENT")).toBeNull()
    expect(wrongAreaRedirect("/ricevute/abc", "PARENT")).toBeNull()
    expect(wrongAreaRedirect("/imposta-password", "TEACHER")).toBeNull()
  })
})
