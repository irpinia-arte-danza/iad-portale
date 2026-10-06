import Link from "next/link"
import { MessageCircle, Phone, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { whatsappHref } from "@/lib/utils/whatsapp"

// ─────────────────────────────────────────────────────────────────────────
// Chi paga, con i due modi per raggiungerlo.
//
// Il contatto stava in fondo alla scheda, dentro "Genitori e tutori": per
// telefonare a una famiglia bisognava scorrere tutta la pagina. Qui sta
// sotto gli stati, con WhatsApp e Chiama a portata di pollice.
// ─────────────────────────────────────────────────────────────────────────

export type PayerInfo = {
  name: string
  phone: string | null
  email: string | null
  // true quando paga l'allieva stessa (maggiorenne senza genitori collegati)
  isAthlete: boolean
  // null quando è l'allieva: non c'è una scheda genitore da aprire
  parentId: string | null
}

interface AthletePayerRowProps {
  athleteId: string
  payer: PayerInfo | null
}

export function AthletePayerRow({ athleteId, payer }: AthletePayerRowProps) {
  if (!payer) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-dashed p-3 text-sm">
        {/* Rosso: non si emettono ricevute né solleciti, la famiglia è
            irraggiungibile */}
        <span className="text-status-block">Nessun genitore collegato</span>
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/athletes/${athleteId}?tab=anagrafica`}>
            <UserPlus className="h-4 w-4" />
            Collega
          </Link>
        </Button>
      </div>
    )
  }

  const wa = whatsappHref(payer.phone)

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="text-sm">
          <span className="text-muted-foreground">Paga </span>
          {payer.parentId ? (
            <Link
              href={`/admin/parents/${payer.parentId}`}
              className="font-medium hover:underline"
            >
              {payer.name}
            </Link>
          ) : (
            <span className="font-medium">{payer.name}</span>
          )}
          {payer.isAthlete ? (
            <span className="text-muted-foreground"> — paga lei</span>
          ) : null}
        </p>
        <p className="truncate font-mono text-xs text-muted-foreground">
          {[payer.phone, payer.email].filter(Boolean).join(" · ") ||
            "Nessun contatto in anagrafica"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {wa ? (
          <Button asChild variant="outline" size="sm" className="h-11">
            <a href={wa} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </Button>
        ) : null}
        {payer.phone ? (
          <Button asChild variant="outline" size="sm" className="h-11">
            <a href={`tel:${payer.phone}`}>
              <Phone className="h-4 w-4" />
              Chiama
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  )
}
