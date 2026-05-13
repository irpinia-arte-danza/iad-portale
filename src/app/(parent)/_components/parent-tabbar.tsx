"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"

const TABS = [
  { href: "/parent/dashboard", label: "Home", icon: Home, exact: true },
  { href: "/parent/stages", label: "Stage", icon: Sparkles, exact: false },
] as const

export function ParentTabbar() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t bg-card">
      <div className="flex h-16 items-center justify-around">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = t.exact
            ? pathname === t.href
            : pathname?.startsWith(t.href)
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex min-h-[44px] min-w-[64px] flex-col items-center justify-center gap-1 rounded-md px-4 py-2 text-xs",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{t.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
