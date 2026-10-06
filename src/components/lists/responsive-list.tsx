"use client"

import * as React from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────
// Una lista, tre larghezze.
//
// Sotto 768 px le tabelle di shadcn non diventano card: nascondono colonne.
// Dal telefono di Allieve si vedevano nome ed età, e lo stato del certificato
// e il menu delle azioni restavano fuori — cioè le due cose per cui si apre
// l'elenco.
//
// Qui la riga è una sola nel DOM e si ridispone, come in Scadenze (#38) e
// Ricevute (#40): niente tabella e card in due copie, perché duplicare la
// riga vuol dire duplicare anche i menu e i dialog che ci stanno dentro.
// Sotto 768 è una card: la prima colonna (il nome, unico link della riga),
// al massimo due righe di stato e le azioni a tutta larghezza in fondo. Da
// 768 in su è una tabella, e le colonne a priorità più bassa compaiono man
// mano che c'è spazio.
//
// Le intestazioni e le celle condividono le stesse classi di larghezza: è
// così che restano allineate senza <table>. Niente ruoli ARIA di tabella:
// con `display: contents` le celle non sono figlie dirette della riga, e una
// struttura di tabella dichiarata a metà confonde più di una lista di righe
// che si leggono da sole (è anche quello che fanno Scadenze e Ricevute).
// ─────────────────────────────────────────────────────────────────────────

export type ColumnPriority = "high" | "medium" | "low"

/** Da quale larghezza compare una colonna */
export const COLUMN_BREAKPOINT: Record<ColumnPriority, "md" | "lg" | "xl"> = {
  // 768: la tabella su iPad verticale
  high: "md",
  // 1024: laptop
  medium: "lg",
  // 1280: desktop pieno
  low: "xl",
}

const BREAKPOINT_ORDER = ["md", "lg", "xl"] as const
export type ListBreakpoint = (typeof BREAKPOINT_ORDER)[number]

export type ListColumn<T> = {
  key: string
  header: React.ReactNode
  cell: (item: T) => React.ReactNode
  /** Default "high". La prima colonna è sempre visibile, qualunque priorità */
  priority?: ColumnPriority
  /** Larghezza nella tabella, es. "md:w-28". Default: si allarga da sola */
  width?: string
  align?: "left" | "right" | "center"
  /** Classi aggiuntive sulla cella (non sull'intestazione) */
  cellClassName?: string
}

export function columnPriority<T>(
  column: ListColumn<T>,
  index: number,
): ColumnPriority {
  // La prima colonna è il nome: non sparisce mai, è l'unico modo di
  // riconoscere la riga
  if (index === 0) return "high"
  return column.priority ?? "high"
}

/** Quali colonne si vedono a una certa larghezza */
export function visibleColumnsAt<T>(
  columns: ListColumn<T>[],
  breakpoint: ListBreakpoint,
): ListColumn<T>[] {
  const available = BREAKPOINT_ORDER.indexOf(breakpoint)
  return columns.filter((column, index) => {
    const needed = BREAKPOINT_ORDER.indexOf(
      COLUMN_BREAKPOINT[columnPriority(column, index)],
    )
    return needed <= available
  })
}

function visibilityClass(priority: ColumnPriority, isFirst: boolean): string {
  // La prima colonna si vede anche in card
  if (isFirst) return "flex"
  switch (COLUMN_BREAKPOINT[priority]) {
    case "md":
      return "hidden md:flex"
    case "lg":
      return "hidden lg:flex"
    case "xl":
      return "hidden xl:flex"
  }
}

const ALIGN_CLASS = {
  left: "justify-start text-left",
  right: "justify-end text-right",
  center: "justify-center text-center",
} as const

function cellClasses<T>(column: ListColumn<T>, index: number): string {
  return cn(
    "min-w-0 items-center",
    visibilityClass(columnPriority(column, index), index === 0),
    column.width ?? (index === 0 ? "md:flex-1" : "md:flex-none"),
    ALIGN_CLASS[column.align ?? "left"],
  )
}

export type ListSelection = {
  /** Id selezionabili: le righe su cui la checkbox compare */
  selectableIds: string[]
  selected: Set<string>
  onSelectedChange: (next: Set<string>) => void
  /** Etichetta per chi legge con la voce, es. «Seleziona Rossi Maria» */
  rowLabel: (id: string) => string
  selectAllLabel: string
}

export type ResponsiveListProps<T> = {
  items: T[]
  getId: (item: T) => string
  columns: ListColumn<T>[]
  /**
   * Le righe di stato della card, sotto 768. Al massimo due: una card con
   * cinque righe non si legge più di una tabella stretta. La terza viene
   * ignorata di proposito.
   */
  cardLines: (item: T) => React.ReactNode[]
  /**
   * Le azioni della riga: un solo nodo, che dentro sceglie da sé come
   * mostrarsi (tasti a tutta larghezza in card, menu ⋯ in tabella — vedi
   * RowActionsRenderer con layout="responsive").
   */
  actions?: (item: T) => React.ReactNode
  selection?: ListSelection
  empty: { title: string; hint: string }
  rowClassName?: (item: T) => string | undefined
  onRowClick?: (item: T) => void
  /** Nome della lista per chi legge con la voce */
  label: string
}

export function ResponsiveList<T>({
  items,
  getId,
  columns,
  cardLines,
  actions,
  selection,
  empty,
  rowClassName,
  onRowClick,
  label,
}: ResponsiveListProps<T>) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h3 className="text-sm font-medium">{empty.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{empty.hint}</p>
      </div>
    )
  }

  const allSelected =
    selection !== undefined &&
    selection.selectableIds.length > 0 &&
    selection.selectableIds.every((id) => selection.selected.has(id))
  const someSelected =
    selection !== undefined &&
    selection.selectableIds.some((id) => selection.selected.has(id))
  const headerChecked: boolean | "indeterminate" = allSelected
    ? true
    : someSelected
      ? "indeterminate"
      : false

  function toggleOne(id: string, checked: boolean) {
    if (!selection) return
    const next = new Set(selection.selected)
    if (checked) next.add(id)
    else next.delete(id)
    selection.onSelectedChange(next)
  }

  return (
    <div aria-label={label} className="rounded-md border">
      {/* Intestazione: solo da 768, in card non serve — ogni valore ha la sua
          etichetta accanto */}
      <div className="hidden items-center gap-3 border-b px-3 py-2 text-xs font-medium text-muted-foreground md:flex">
        {selection ? (
          <div className="flex items-center">
            <Checkbox
              checked={headerChecked}
              onCheckedChange={(c) =>
                selection.onSelectedChange(
                  c === true ? new Set(selection.selectableIds) : new Set(),
                )
              }
              disabled={selection.selectableIds.length === 0}
              aria-label={selection.selectAllLabel}
              className="size-5"
            />
          </div>
        ) : null}
        {columns.map((column, index) => (
          <div key={column.key} className={cellClasses(column, index)}>
            {column.header}
          </div>
        ))}
        {actions ? (
          <div className="ml-auto w-11 shrink-0">
            <span className="sr-only">Azioni</span>
          </div>
        ) : null}
      </div>

      <ul>
        {items.map((item) => {
          const id = getId(item)
          const selectable =
            selection !== undefined && selection.selectableIds.includes(id)
          const isSelected = selectable && selection.selected.has(id)
          const lines = cardLines(item).slice(0, 2)

          return (
            <li
              key={id}
              data-state={isSelected ? "selected" : undefined}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
              className={cn(
                "flex flex-col gap-2 border-b px-3 py-3 last:border-b-0 data-[state=selected]:bg-muted/50 md:flex-row md:items-center md:gap-3",
                onRowClick && "cursor-pointer hover:bg-muted/50",
                rowClassName?.(item),
              )}
            >
              <div className="flex min-w-0 items-start gap-2 md:contents">
                {selection ? (
                  <div
                    className="flex shrink-0 items-center self-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {selectable ? (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(c) => toggleOne(id, c === true)}
                        aria-label={selection.rowLabel(id)}
                        className="size-5"
                      />
                    ) : (
                      // Il posto resta occupato: senza, le righe non
                      // selezionabili sbandano a sinistra
                      <span className="block size-5" aria-hidden />
                    )}
                  </div>
                ) : null}

                <div className="flex min-w-0 flex-1 flex-col gap-1 md:contents">
                  {columns.map((column, index) => (
                    <div
                      key={column.key}
                      className={cn(
                        cellClasses(column, index),
                        column.cellClassName,
                      )}
                    >
                      {column.cell(item)}
                    </div>
                  ))}

                  {/* Le due righe di stato: solo in card, in tabella sono
                      già colonne */}
                  {lines.length > 0 ? (
                    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground md:hidden">
                      {lines.map((line, i) => (
                        <div key={i} className="min-w-0">
                          {line}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              {actions ? (
                <div
                  className="md:ml-auto md:shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {actions(item)}
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
