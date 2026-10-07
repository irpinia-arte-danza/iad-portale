"use client"

import * as React from "react"
import { Check, Copy } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { logError } from "@/lib/logging/log-error"

// ─────────────────────────────────────────────────────────────────────────
// «Come pagare»: intestatario, IBAN e causale, ognuno con il suo tasto
// Copia. La causale la compone il portale (payment-reference.ts), così
// Giuseppina riconosce il bonifico senza cercare. Tutto a una colonna, tasti
// alti 44 px a tutta larghezza: si usa con una mano, dal telefono.
// ─────────────────────────────────────────────────────────────────────────

type Reference = { athleteId: string; athleteName: string; reference: string }

type Props = {
  accountHolder: string
  // Già con gli spazi ogni quattro (prettyIban): si legge e si ricopia
  ibanPretty: string
  // Senza spazi: è quello che va incollato nell'app della banca
  ibanElectronic: string
  references: Reference[]
}

export function PaymentInstructions({
  accountHolder,
  ibanPretty,
  ibanElectronic,
  references,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Come pagare</CardTitle>
        <CardDescription>
          Con un bonifico, copiando i tre dati qui sotto nell&apos;app della banca, oppure in
          contanti in sala.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CopyBlock label="Intestatario" value={accountHolder} copyValue={accountHolder} />
        <CopyBlock label="IBAN" value={ibanPretty} copyValue={ibanElectronic} mono />
        {references.length === 0 ? (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Causale
            </p>
            <p className="text-sm text-muted-foreground">
              Compare qui quando c&apos;è una rata da pagare, già scritta con il mese e il nome.
            </p>
          </div>
        ) : (
          references.map((r) => (
            <CopyBlock
              key={r.athleteId}
              label={references.length > 1 ? `Causale per ${r.athleteName}` : "Causale"}
              value={r.reference}
              copyValue={r.reference}
            />
          ))
        )}
        <p className="text-sm text-muted-foreground">
          <strong className="font-medium text-foreground">Oppure in contanti in sala</strong>: la
          ricevuta la trovi qui appena la segreteria la registra.
        </p>
      </CardContent>
    </Card>
  )
}

function CopyBlock({
  label,
  value,
  copyValue,
  mono = false,
}: {
  label: string
  value: string
  copyValue: string
  mono?: boolean
}) {
  const [copied, setCopied] = React.useState(false)

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(copyValue)
      setCopied(true)
      toast.success(`${label} copiato`)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      logError("[portale] copia negli appunti", error)
      toast.error("Copia non riuscita: tieni premuto sul testo e copia a mano")
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={
          mono
            ? "rounded-md bg-muted px-3 py-2 font-mono text-sm tabular-nums break-all select-all"
            : "rounded-md bg-muted px-3 py-2 text-sm break-words select-all"
        }
      >
        {value}
      </p>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full"
        onClick={onCopy}
        aria-label={`Copia ${label.toLowerCase()}`}
      >
        {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
        {copied ? "Copiato" : `Copia ${label.toLowerCase()}`}
      </Button>
    </div>
  )
}
