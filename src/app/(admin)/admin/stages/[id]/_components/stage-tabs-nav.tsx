"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"

type Tab = {
  key: string
  label: string
  disabled?: boolean
}

type Props = {
  tabs: Tab[]
  activeKey: string
  basePath: string
}

export function StageTabsNav({ tabs, activeKey, basePath }: Props) {
  const pathname = usePathname()
  const params = useSearchParams()

  function buildHref(tab: Tab) {
    const sp = new URLSearchParams(params?.toString())
    sp.set("tab", tab.key)
    return `${basePath}?${sp.toString()}`
  }

  return (
    <div className="border-b">
      <nav className="-mb-px flex gap-1 overflow-x-auto">
        {tabs.map((t) => {
          const active = t.key === activeKey
          if (t.disabled) {
            return (
              <span
                key={t.key}
                className="cursor-not-allowed border-b-2 border-transparent px-4 py-2 text-sm text-muted-foreground/60"
                title="Disponibile a stage svolto"
              >
                {t.label}
              </span>
            )
          }
          return (
            <Link
              key={t.key}
              href={buildHref(t)}
              className={cn(
                "border-b-2 px-4 py-2 text-sm transition-colors whitespace-nowrap",
                active
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          )
        })}
      </nav>
      <span className="hidden">{pathname}</span>
    </div>
  )
}
