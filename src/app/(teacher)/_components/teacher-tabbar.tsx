"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home } from "lucide-react"

import { cn } from "@/lib/utils"

export function TeacherTabbar() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t bg-card">
      <div className="flex h-16 items-center justify-around">
        <Link
          href="/teacher/dashboard"
          className={cn(
            "flex min-h-[44px] min-w-[64px] flex-col items-center justify-center gap-1 rounded-md px-4 py-2 text-xs",
            pathname === "/teacher/dashboard"
              ? "text-foreground"
              : "text-muted-foreground"
          )}
        >
          <Home className="h-5 w-5" />
          <span>Home</span>
        </Link>
      </div>
    </nav>
  )
}
