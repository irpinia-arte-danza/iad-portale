import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { todoGroups, type TodoTile } from "@/lib/dashboard/todo-tiles"
import { formatEur } from "@/lib/utils/format"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────
// Il primo blocco della dashboard: cosa c'è da fare oggi, non com'è andato
// l'anno. Ogni riquadro è un numero e un posto dove andare — cliccandolo si
// apre l'elenco di quelle righe, già filtrato.
// ─────────────────────────────────────────────────────────────────────────

const TONE = {
  red: {
    tile: "border-red-300 bg-red-50 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:hover:bg-red-950/60",
    count: "text-red-700 dark:text-red-300",
    label: "text-red-900 dark:text-red-100",
  },
  amber: {
    tile: "border-amber-300 bg-amber-50 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:hover:bg-amber-950/60",
    count: "text-amber-700 dark:text-amber-300",
    label: "text-amber-900 dark:text-amber-100",
  },
} as const

function TodoTileLink({ tile }: { tile: TodoTile }) {
  const tone = TONE[tile.tone]
  return (
    <Link
      href={tile.href}
      className={cn(
        "group flex min-h-[88px] flex-col justify-between gap-1 rounded-lg border p-3 transition-colors",
        tone.tile,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn("font-mono text-3xl leading-none font-bold", tone.count)}>
          {tile.count}
        </span>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
      <div className="space-y-0.5">
        <p className={cn("text-sm leading-tight font-medium", tone.label)}>
          {tile.label}
        </p>
        {tile.amountCents !== undefined ? (
          <p className="font-mono text-xs text-muted-foreground">
            {formatEur(tile.amountCents)}
          </p>
        ) : null}
        {tile.note ? (
          <p className="text-xs text-muted-foreground">{tile.note}</p>
        ) : null}
      </div>
    </Link>
  )
}

export function TodoBlock({ tiles }: { tiles: TodoTile[] }) {
  const groups = todoGroups(tiles)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Da fare</CardTitle>
        <CardDescription>
          {groups.length === 0
            ? "Niente in sospeso."
            : "Clicca un riquadro per aprire l'elenco di quelle righe."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-dashed p-6">
            <Check className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-sm font-medium">Tutto in ordine</p>
              <p className="text-sm text-muted-foreground">
                Nessun contributo in ritardo, nessuna ricevuta da emettere,
                nessun documento scaduto.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {groups.map(({ group, tiles: groupTiles }) => (
              <div key={group} className="space-y-2">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {group}
                </p>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {groupTiles.map((tile) => (
                    <TodoTileLink key={tile.id} tile={tile} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
