"use client"

import * as React from "react"
import { Check, Copy } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type Props = {
  iban: string | null
  asdName: string | null
  asdEmail: string | null
}

export function IbanCard({ iban, asdName, asdEmail }: Props) {
  const [copied, setCopied] = React.useState<"iban" | null>(null)

  async function copy(value: string, key: "iban") {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      toast.success("Copiato negli appunti")
      setTimeout(() => setCopied(null), 1500)
    } catch {
      toast.error("Copia fallita")
    }
  }

  if (!iban) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bonifico bancario</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Per i dati di pagamento contatta{" "}
          <a
            href={`mailto:${asdEmail ?? "info@irpiniaartedanza.it"}`}
            className="underline underline-offset-4"
          >
            {asdEmail ?? "info@irpiniaartedanza.it"}
          </a>
          .
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Bonifico bancario</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            IBAN intestato a {asdName ?? "ASD IAD"}
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded-md bg-muted px-3 py-2 font-mono text-sm">
              {iban}
            </code>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="min-h-11 min-w-11 shrink-0"
              onClick={() => copy(iban, "iban")}
              aria-label="Copia IBAN"
            >
              {copied === "iban" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs">
          <p className="font-medium">Causale suggerita</p>
          <p className="text-muted-foreground">
            Quota [nome allieva] [mese o periodo]
          </p>
        </div>

        <p className={cn("text-xs text-muted-foreground")}>
          Dopo il bonifico, la conferma viene registrata entro 1-2 giorni
          lavorativi.
        </p>
      </CardContent>
    </Card>
  )
}
