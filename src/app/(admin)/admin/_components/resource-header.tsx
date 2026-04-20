"use client"

import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

interface Breadcrumb {
  label: string
  href?: string
}

interface ResourceHeaderProps {
  breadcrumbs?: Breadcrumb[]
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function ResourceHeader({
  breadcrumbs = [],
  title,
  description,
  action,
  className,
}: ResourceHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-3 pb-6 border-b", className)}>
      {breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1 text-xs text-muted-foreground"
        >
          <Link
            href="/admin/dashboard"
            className="flex items-center hover:text-foreground"
          >
            <Home className="h-3 w-3" />
          </Link>
          {breadcrumbs.map((crumb, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3" />
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-foreground">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{crumb.label}</span>
              )}
            </div>
          ))}
        </nav>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
    </header>
  )
}
