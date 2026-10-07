"use client"

import * as React from "react"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { CardStatusBadge } from "@/components/affiliations/card-status-badge"
import { Button } from "@/components/ui/button"
import { classifyCard } from "@/lib/affiliations/card-status"
import { logError } from "@/lib/logging/log-error"
import { statusTone, TONE_SURFACE, TONE_TEXT } from "@/lib/status/tone"
import { formatDateShort } from "@/lib/utils/format"
import { cn } from "@/lib/utils"

import { getPortalCardUrl } from "../../_actions/card-actions"

type Props = {
  card: {
    id: string
    entity: string
    cardNumber: string | null
    cardType: string | null
    cardYear: number
    expiryDate: Date | null
    filePath: string | null
  } | null
}

// La tessera dell'ente vista dalla famiglia. È anche la copertura
// assicurativa: se manca o è scaduta, il genitore deve vederlo da solo, in
// rosso, perché senza copertura la lezione non si fa. Il PDF si apre con un
// link firmato chiesto al clic (cinque minuti).
export function AthleteCardBlock({ card }: Props) {
  const [loading, setLoading] = React.useState(false)
  const status = classifyCard(card?.expiryDate ?? null)
  const tone = statusTone({ kind: "card", status })

  async function onDownload() {
    if (!card) return
    setLoading(true)
    try {
      const result = await getPortalCardUrl(card.id)
      if (!result.ok || !result.data) {
        toast.error(result.ok ? "Link non disponibile" : result.error)
        return
      }
      window.open(result.data.signedUrl, "_blank", "noopener,noreferrer")
    } catch (error) {
      logError("[portale] download tessera", error)
      toast.error("Errore durante il download")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("space-y-2 rounded-md border p-3", TONE_SURFACE[tone])}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tessera e assicurazione
        </h3>
        <CardStatusBadge status={status} />
      </div>
      {!card ? (
        <p className={cn("text-sm", TONE_TEXT[tone])}>
          Nessuna tessera registrata: senza tessera non c&apos;è assicurazione e non può fare
          lezione. La prepara la segreteria: se il tesseramento è già stato fatto, arriverà qui.
        </p>
      ) : (
        <>
          <p className="text-sm font-medium">
            {card.entity} n. {card.cardNumber ?? "—"}
            {card.cardType ? ` ${card.cardType}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            Anno sociale {card.cardYear}
            {card.expiryDate
              ? ` · scade il ${formatDateShort(new Date(card.expiryDate))}`
              : ""}
          </p>
          {status === "expired" ? (
            <p className={cn("text-sm", TONE_TEXT[tone])}>
              Tessera scaduta: senza assicurazione non può fare lezione. Chiedi in segreteria
              il rinnovo.
            </p>
          ) : null}
          {card.filePath ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full"
              onClick={onDownload}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Scarica la tessera
            </Button>
          ) : null}
        </>
      )}
    </div>
  )
}
