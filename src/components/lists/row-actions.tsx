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
// Nella tabella stanno nel menu ⋯. Nella card del telefono c'è UN tasto
// principale (quello per cui si apre l'elenco: Incassa, WhatsApp, Emetti
// ricevuta) e tutto il resto in un menu «…» da 44 px. Prima erano tutti
// tasti a tutta larghezza, uno sotto l'altro: con quattro azioni per riga
// l'elenco delle allieve sul telefono era lungo 12.600 px, e «Sposta nel
// cestino» era grande quanto «Incassa».
//
// Ogni *RowActions descrive le sue azioni come dati e lascia a questi
// componenti il come: una lista sola, quindi tabella e card non divergono.
// Una voce che non si può usare non si mostra in card (un tasto spento su
// ogni riga è rumore): chi chiama la toglie dalla lista quando può.
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
  // Il tasto della card sul telefono: al massimo uno per riga (il primo vince)
  primary?: boolean
  // Solo in card: in tabella c'è già una colonna che fa la stessa cosa
  cardOnly?: boolean
}

function ActionIcon({ icon: Icon }: { icon?: LucideIcon }) {
  return Icon ? <Icon className="h-4 w-4" /> : null
}

/** Tabella: il menu ⋯ */
export function RowActionsMenu({
  actions,
  label = "Azioni",
  align = "end",
  triggerClassName,
}: {
  actions: RowAction[]
  label?: string
  align?: "start" | "end"
  triggerClassName?: string
}) {
  if (actions.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          className={triggerClassName}
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

/** Tasti in colonna a tutta larghezza, 44 px: per pannelli e schede */
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

/** Le voci divise per la card: il tasto principale e il resto del menu */
export function splitCardActions(actions: RowAction[]): {
  primary: RowAction | null
  rest: RowAction[]
} {
  // In card le voci spente non compaiono
  const usable = actions.filter((a) => !a.disabled)
  const primary = usable.find((a) => a.primary) ?? null
  return { primary, rest: usable.filter((a) => a !== primary) }
}

/** Card del telefono: un tasto principale e il menu «…» da 44 px */
export function RowActionsCard({
  actions,
  label,
}: {
  actions: RowAction[]
  label?: string
}) {
  const { primary, rest } = splitCardActions(actions)
  if (!primary && rest.length === 0) return null

  const menu =
    rest.length > 0 ? (
      <RowActionsMenu actions={rest} label={label} triggerClassName="size-11 shrink-0" />
    ) : null

  // Senza tasto principale resta solo il menu: la lista lo mette nell'angolo
  // della card (data-row-menu-only), senza una riga tutta per lui
  if (!primary) return <div data-row-menu-only>{menu}</div>

  const content = (
    <>
      <ActionIcon icon={primary.icon} />
      {primary.label}
    </>
  )
  return (
    <div className="flex items-center gap-2">
      {primary.href !== undefined ? (
        <Button asChild className="h-11 min-w-0 flex-1">
          {primary.external ? (
            <a href={primary.href} target="_blank" rel="noopener noreferrer">
              {content}
            </a>
          ) : (
            <Link href={primary.href}>{content}</Link>
          )}
        </Button>
      ) : (
        <Button className="h-11 min-w-0 flex-1" onClick={primary.onSelect}>
          {content}
        </Button>
      )}
      {menu}
    </div>
  )
}

/**
 * Quello che ogni *RowActions riceve dalla lista: in tabella il menu,
 * "stacked" i tasti in colonna (pannelli e schede, non le liste),
 * "responsive" card sotto 768 e menu da 768 in su, con un solo stato. Il
 * default è il menu, così un chiamante che non lo passa resta come prima.
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
  const tableActions = actions.filter((a) => !a.cardOnly)
  if (layout === "stacked") return <RowActionsStack actions={tableActions} />
  if (layout === "menu") {
    return <RowActionsMenu actions={tableActions} label={label} />
  }

  // Responsive: card sotto 768, menu da 768 in su. Due inneschi, un solo
  // componente: i dialog del chiamante restano montati una volta sola, e le
  // voci vengono dalla stessa lista.
  return (
    <>
      <div className="md:hidden">
        <RowActionsCard actions={actions} label={label} />
      </div>
      <div className="hidden md:block">
        <RowActionsMenu actions={tableActions} label={label} />
      </div>
    </>
  )
}
