"use client"

import * as React from "react"
import Link from "next/link"
import { MoreHorizontal } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────
// Le azioni di una riga, scritte una volta e mostrate in due modi.
//
// Nella tabella stanno nel menu ⋯, dove c'è spazio per una sola colonna.
// Nella card del telefono il menu non va: un bersaglio da 24 px in fondo a
// destra, con le voci che escono fuori schermo. Lì diventano tasti a tutta
// larghezza, le stesse voci nello stesso ordine.
//
// Per questo ogni *RowActions descrive le sue azioni come dati e lascia a
// questi due componenti il come: il rischio è che le due versioni divergano,
// e con una lista sola di RowAction non può capitare.
// ─────────────────────────────────────────────────────────────────────────

export type RowAction = {
  key: string
  label: string
  icon?: LucideIcon
  // Un'azione o un link, non entrambi
  onSelect?: () => void
  href?: string
  // Link a un PDF o a una pagina esterna: nuova scheda
  external?: boolean
  disabled?: boolean
  destructive?: boolean
  // Una riga di separazione sopra questa voce
  separatorBefore?: boolean
}

function ActionIcon({ icon: Icon }: { icon?: LucideIcon }) {
  return Icon ? <Icon className="h-4 w-4" /> : null
}

/** Tabella: il menu ⋯ */
export function RowActionsMenu({
  actions,
  label = "Azioni",
  align = "end",
}: {
  actions: RowAction[]
  label?: string
  align?: "start" | "end"
}) {
  if (actions.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {actions.map((action) => (
          // Fragment e non un div: Radix tiene gli item in una collection, e
          // un wrapper in mezzo non serve a niente
          <React.Fragment key={action.key}>
            {action.separatorBefore ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              disabled={action.disabled}
              variant={action.destructive ? "destructive" : "default"}
              onSelect={action.onSelect}
              asChild={action.href !== undefined && !action.disabled}
            >
              {action.href !== undefined && !action.disabled ? (
                action.external ? (
                  <a
                    href={action.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ActionIcon icon={action.icon} />
                    {action.label}
                  </a>
                ) : (
                  <Link href={action.href}>
                    <ActionIcon icon={action.icon} />
                    {action.label}
                  </Link>
                )
              ) : (
                <>
                  <ActionIcon icon={action.icon} />
                  {action.label}
                </>
              )}
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Card del telefono: tasti a tutta larghezza, 44 px di altezza */
export function RowActionsStack({ actions }: { actions: RowAction[] }) {
  if (actions.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {actions.map((action) => {
        const className = cn("h-11 w-full justify-start")
        const content = (
          <>
            <ActionIcon icon={action.icon} />
            {action.label}
          </>
        )

        if (action.href !== undefined && !action.disabled) {
          return (
            <Button
              key={action.key}
              asChild
              variant={action.destructive ? "destructive" : "outline"}
              className={className}
            >
              {action.external ? (
                <a href={action.href} target="_blank" rel="noopener noreferrer">
                  {content}
                </a>
              ) : (
                <Link href={action.href}>{content}</Link>
              )}
            </Button>
          )
        }

        return (
          <Button
            key={action.key}
            variant={action.destructive ? "destructive" : "outline"}
            className={className}
            disabled={action.disabled}
            onClick={action.onSelect}
          >
            {content}
          </Button>
        )
      })}
    </div>
  )
}

/**
 * Quello che ogni *RowActions riceve dalla lista: in tabella il menu, in card
 * i tasti, "responsive" entrambi gli inneschi con un solo stato. Il default è
 * il menu, così un chiamante che non lo passa resta come prima.
 */
export type RowActionsLayout = "menu" | "stacked" | "responsive"

export function RowActionsRenderer({
  actions,
  layout = "menu",
  label,
}: {
  actions: RowAction[]
  layout?: RowActionsLayout
  label?: string
}) {
  if (layout === "stacked") return <RowActionsStack actions={actions} />
  if (layout === "menu") {
    return <RowActionsMenu actions={actions} label={label} />
  }

  // Responsive: tasti sotto 768, menu da 768 in su. Due inneschi, un solo
  // componente: i dialog del chiamante restano montati una volta sola, e le
  // voci sono per costruzione le stesse.
  return (
    <>
      <div className="md:hidden">
        <RowActionsStack actions={actions} />
      </div>
      <div className="hidden md:block">
        <RowActionsMenu actions={actions} label={label} />
      </div>
    </>
  )
}
