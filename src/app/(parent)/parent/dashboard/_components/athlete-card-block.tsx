"use client"

import * as React from "react"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { CardStatusBadge } from "@/components/affiliations/card-status-badge"
import { Button } from "@/components/ui/button"
import { classifyCard } from "@/lib/affiliations/card-status"
import { formatDateShort } from "@/lib/utils/format"

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
// assicurativa: se è scaduta, il genitore deve poterlo vedere da solo.
export function AthleteCardBlock({ card }: Props) {
  const [loading, setLoading] = React.useState(false)

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
      console.error("[portale] download tessera", error)
      toast.error("Errore durante il download")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Tessera e assicurazione
      </h3>
      {!card ? (
        <p className="text-sm text-muted-foreground">
          Nessuna tessera registrata. La prepara la segreteria: se il
          tesseramento è già stato fatto, arriverà qui.
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2">
          <div className="min-w-0">
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
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <CardStatusBadge status={classifyCard(card.expiryDate)} />
            {card.filePath ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onDownload}
                disabled={loading}
                className="min-h-11"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Scarica
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
