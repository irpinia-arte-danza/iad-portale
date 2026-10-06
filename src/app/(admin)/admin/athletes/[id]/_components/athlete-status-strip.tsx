import Link from "next/link"
import { CreditCard, Stethoscope, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { AthleteStatusItem, StatusTone } from "@/lib/athletes/athlete-status"
import { cn } from "@/lib/utils"

import { MedicalCertUploadButton } from "./medical-cert-upload-button"

// Tre riquadri in testa alla scheda: si può fare lezione? si è in pari con i
// contributi? si è tesserate? Su telefono uno sotto l'altro.

const TONE: Record<StatusTone, string> = {
  red: "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40",
  amber:
    "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
  neutral: "border-border bg-muted/30",
}

const TONE_TEXT: Record<StatusTone, string> = {
  red: "text-red-900 dark:text-red-200",
  amber: "text-amber-900 dark:text-amber-200",
  neutral: "text-foreground",
}

function StatusCard({
  item,
  icon,
  action,
  mono,
}: {
  item: AthleteStatusItem
  icon: React.ReactNode
  action?: React.ReactNode
  mono?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-lg border p-3",
        TONE[item.tone],
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        <span className={cn("mt-0.5 shrink-0", TONE_TEXT[item.tone])}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className={cn("text-sm font-medium", TONE_TEXT[item.tone])}>
            {item.label}
          </p>
          {item.detail ? (
            <p
              className={cn(
                "truncate text-xs text-muted-foreground",
                mono && "font-mono",
              )}
            >
              {item.detail}
            </p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  )
}

interface AthleteStatusStripProps {
  athleteId: string
  certificate: AthleteStatusItem
  contributions: AthleteStatusItem
  card: AthleteStatusItem
}

export function AthleteStatusStrip({
  athleteId,
  certificate,
  contributions,
  card,
}: AthleteStatusStripProps) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <StatusCard
        item={certificate}
        icon={<Stethoscope className="h-4 w-4" />}
        action={
          certificate.action === "CARICA_CERTIFICATO" ? (
            <MedicalCertUploadButton athleteId={athleteId} />
          ) : null
        }
      />
      <StatusCard
        item={contributions}
        icon={<Wallet className="h-4 w-4" />}
        mono
      />
      <StatusCard
        item={card}
        icon={<CreditCard className="h-4 w-4" />}
        action={
          card.action === "VAI_TESSERAMENTO" ? (
            <Button asChild variant="outline" size="sm" className="shrink-0">
              {/* L'elenco da mandare al referente: la tessera non si crea
                  dal gestionale, la fa l'ente */}
              <Link href="/admin/tessere#da-tesserare">Vai all&apos;elenco</Link>
            </Button>
          ) : null
        }
      />
    </div>
  )
}
