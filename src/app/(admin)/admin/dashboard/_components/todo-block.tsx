import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { todoSections, type TodoTile } from "@/lib/dashboard/todo-tiles"
import { TONE_SURFACE, TONE_TEXT } from "@/lib/status/tone"
import { formatEuro } from "@/lib/utils/format"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────
// Il primo blocco della dashboard: cosa c'è da fare oggi.
//
// Due sezioni e non tre gruppi per argomento: "Blocca qualcosa" è quello che
// impedisce di fare lezione o di emettere un documento, "Da sistemare" il
// resto. Il colore non si decide qui: arriva dal tono del riquadro, che
// arriva da statusTone.
// ─────────────────────────────────────────────────────────────────────────

function TodoTileLink({ tile }: { tile: TodoTile }) {
  return (
    <Link
      href={tile.href}
      className={cn(
        "group flex min-h-[88px] flex-col justify-between gap-1 rounded-lg border p-3 transition-colors hover:brightness-[0.97] dark:hover:brightness-110",
        TONE_SURFACE[tile.tone],
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "font-mono text-3xl leading-none font-bold",
            TONE_TEXT[tile.tone],
          )}
        >
          {tile.count}
        </span>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
      <div className="space-y-0.5">
        <p className={cn("text-sm leading-tight font-medium", TONE_TEXT[tile.tone])}>
          {tile.label}
        </p>
        {tile.amountCents !== undefined ? (
          <p className="font-mono text-xs text-muted-foreground">
            {formatEuro(tile.amountCents)}
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
  const sections = todoSections(tiles)

  if (sections.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-6">
          <Check className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="text-sm font-medium">Tutto in ordine</p>
            <p className="text-sm text-muted-foreground">
              Nessun contributo in ritardo, nessuna ricevuta da consegnare,
              nessun documento scaduto.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {sections.map((section) => (
        <Card key={section.id}>
          <CardHeader>
            <CardTitle className="text-base">{section.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* auto-fill: a 1440 i riquadri riempiono la riga, su iPad
                verticale vanno a capo da soli */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3">
              {section.tiles.map((tile) => (
                <TodoTileLink key={tile.id} tile={tile} />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
