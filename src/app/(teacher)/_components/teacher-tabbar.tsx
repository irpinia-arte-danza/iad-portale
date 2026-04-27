"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Users } from "lucide-react"

import { cn } from "@/lib/utils"

const TABS = [
  { href: "/teacher/dashboard", label: "Home", icon: Home, exact: true },
  {
    href: "/teacher/courses",
    label: "Classi",
    icon: Users,
    exact: false,
  },
]

export function TeacherTabbar() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t bg-card">
      <div className="flex h-16 items-center justify-around">
        {TABS.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex min-h-[44px] min-w-[64px] flex-col items-center justify-center gap-1 rounded-md px-4 py-2 text-xs",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
