import { CertStatusBadge } from "@/components/medical-certificates/cert-status-badge"
import { classifyCert } from "@/lib/medical-certificates/certificate-status"
import { statusTone, TONE_SURFACE, TONE_TEXT } from "@/lib/status/tone"
import { formatDateShort } from "@/lib/utils/format"
import { cn } from "@/lib/utils"

// Il certificato medico visto dalla famiglia: solo lo stato e la scadenza,
// niente file (è un dato sanitario: lo consegna la famiglia, lo conserva la
// segreteria). Mancante o scaduto è rosso, con scritto perché.
export function CertificateBlock({ expiryDate }: { expiryDate: Date | null }) {
  const status = classifyCert(expiryDate)
  const tone = statusTone({ kind: "certificate", status })

  return (
    <div className={cn("space-y-2 rounded-md border p-3", TONE_SURFACE[tone])}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Certificato medico
        </h3>
        <CertStatusBadge status={status} />
      </div>
      {status === "missing" ? (
        <p className={cn("text-sm", TONE_TEXT[tone])}>
          Nessun certificato consegnato: senza certificato non può fare lezione. Portalo in
          segreteria appena lo hai.
        </p>
      ) : status === "expired" ? (
        <p className={cn("text-sm", TONE_TEXT[tone])}>
          Scaduto il {formatDateShort(new Date(expiryDate!))}: senza certificato valido non può
          fare lezione. Serve il rinnovo dal medico.
        </p>
      ) : status === "expiring" ? (
        <p className={cn("text-sm", TONE_TEXT[tone])}>
          Scade il {formatDateShort(new Date(expiryDate!))}: prenota la visita per il rinnovo.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Valido fino al {formatDateShort(new Date(expiryDate!))}.
        </p>
      )}
    </div>
  )
}
