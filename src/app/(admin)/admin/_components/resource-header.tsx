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
  // Accanto al titolo: il selettore dell'anno, dove la pagina ne ha uno
  titleAddon?: React.ReactNode
  // Sotto il titolo: la fascia "Stai guardando il …"
  notice?: React.ReactNode
  className?: string
}

export function ResourceHeader({
  breadcrumbs = [],
  title,
  description,
  action,
  titleAddon,
  notice,
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

      {/* Sotto 640 titolo e tasto non stanno affiancati: il tasto va sotto, a
          tutta larghezza e alto 44 px. Vale per ogni pagina. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {titleAddon}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action && (
          <div className="flex flex-col gap-2 max-sm:[&_[data-slot=button]]:h-11 max-sm:[&_[data-slot=button]]:w-full max-sm:[&>*]:w-full max-sm:[&>div]:flex-col sm:shrink-0 sm:flex-row sm:items-center">
            {action}
          </div>
        )}
      </div>
      {notice}
    </header>
  )
}
