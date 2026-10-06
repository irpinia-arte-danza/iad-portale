"use client"

import * as React from "react"
import {
  Download,
  Loader2,
  Paperclip,
  ShieldCheck,
  Trash2,
  Undo2,
} from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  CONSENT_KIND_DESCRIPTIONS,
  CONSENT_KIND_LABELS,
  CONSENT_KINDS,
  isConsentKind,
  SIGNED_BY_ATHLETE,
  type ConsentKind,
} from "@/lib/schemas/consent"
import { statusTone, TONE_BADGE } from "@/lib/status/tone"
import { formatDateShort } from "@/lib/utils/format"
import { cn } from "@/lib/utils"

import {
  getConsentFileUrl,
  restoreConsent,
  softDeleteConsent,
} from "../consent-actions"
import { ConsentFormDialog, type ConsentSigner } from "./consent-form-dialog"

export type ConsentItem = {
  id: string
  type: string
  acceptedAt: Date
  documentVersion: string
  notes: string | null
  // Il modulo firmato, se allegato
  filePath: string | null
  deletedAt: Date | null
  // Chi ha firmato: un genitore, oppure nessuno = l'allieva stessa
  parent: { id: string; firstName: string; lastName: string } | null
}

type Props = {
  athleteId: string
  athleteFirstName: string
  isAdult: boolean
  consents: ConsentItem[]
  parents: { id: string; firstName: string; lastName: string }[]
}

// ─────────────────────────────────────────────────────────────────────────
// Consensi cartacei: informativa privacy e le due liberatorie foto/video.
//
// Tre righe fisse, una per consenso, con «firmato il … da …» oppure
// «Non registrato» e il tasto per registrarlo. Il modulo di carta resta in
// archivio: qui c'è la traccia. Il cestino è della sezione, con ripristino.
// ─────────────────────────────────────────────────────────────────────────
export function ConsentsSection({
  athleteId,
  athleteFirstName,
  isAdult,
  consents,
  parents,
}: Props) {
  const [formKind, setFormKind] = React.useState<ConsentKind | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [trashOpen, setTrashOpen] = React.useState(false)
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null)

  const active = consents.filter((c) => c.deletedAt === null)
  const trashed = consents.filter((c) => c.deletedAt !== null)

  // Il consenso corrente per tipo: il più recente non cestinato (la lista
  // arriva già ordinata per data di firma, decrescente)
  const currentByKind = new Map<ConsentKind, ConsentItem>()
  for (const c of active) {
    if (isConsentKind(c.type) && !currentByKind.has(c.type)) {
      currentByKind.set(c.type, c)
    }
  }

  const signers: ConsentSigner[] = [
    ...parents.map((p) => ({
      value: p.id,
      label: `${p.firstName} ${p.lastName} (genitore)`,
    })),
    ...(isAdult
      ? [{ value: SIGNED_BY_ATHLETE, label: `${athleteFirstName} (l'allieva)` }]
      : []),
  ]

  const missingPrivacy = !currentByKind.has("GDPR")

  async function onConfirmDelete() {
    if (!deletingId) return
    setBusyId(deletingId)
    const result = await softDeleteConsent(deletingId)
    if (result.ok) {
      toast.success("Consenso spostato nel cestino")
      setDeletingId(null)
    } else {
      toast.error(result.error)
    }
    setBusyId(null)
  }

  // Il link nasce qui, al clic, e vive cinque minuti
  async function onDownload(id: string) {
    setDownloadingId(id)
    try {
      const result = await getConsentFileUrl(id)
      const target = result.ok ? result.data?.signedUrl : null
      if (!target) {
        toast.error(result.ok ? "Link non disponibile" : result.error)
        return
      }
      window.open(target, "_blank", "noopener,noreferrer")
    } finally {
      setDownloadingId(null)
    }
  }

  async function onRestore(id: string) {
    setBusyId(id)
    const result = await restoreConsent(id)
    if (result.ok) toast.success("Consenso ripristinato")
    else toast.error(result.error)
    setBusyId(null)
  }

  return (
    <Card>
      <CardHeader className="space-y-1.5">
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          Consensi
        </CardTitle>
        <CardDescription>
          Firme sui moduli cartacei. L&apos;informativa privacy va registrata
          per ogni allieva; le liberatorie solo se firmate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="divide-y rounded-md border">
          {CONSENT_KINDS.map((kind) => {
            const current = currentByKind.get(kind) ?? null
            // Solo la privacy che manca si colora: è il passo di «Da
            // completare». Le liberatorie non firmate sono una scelta.
            const tone =
              kind === "GDPR" && !current
                ? statusTone({ kind: "setupStep", step: "privacy" })
                : "neutral"
            return (
              <li
                key={kind}
                className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">
                      {CONSENT_KIND_LABELS[kind]}
                    </p>
                    {current ? (
                      <Badge variant="outline">Firmato</Badge>
                    ) : null}
                    {current?.filePath ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                        Modulo allegato
                      </span>
                    ) : null}
                    {current ? null : (
                      <Badge
                        variant="outline"
                        className={cn(TONE_BADGE[tone])}
                      >
                        Non registrato
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {current
                      ? `Firmato il ${formatDateShort(new Date(current.acceptedAt))} da ${signerLabel(current)}`
                      : CONSENT_KIND_DESCRIPTIONS[kind]}
                  </p>
                  {current?.notes ? (
                    <p className="text-xs italic text-muted-foreground">
                      {current.notes}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {current?.filePath ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-11"
                      onClick={() => onDownload(current.id)}
                      disabled={downloadingId !== null}
                    >
                      {downloadingId === current.id ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-1 h-4 w-4" />
                      )}
                      Scarica
                    </Button>
                  ) : null}
                  {current ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="min-h-11 min-w-11 text-muted-foreground hover:text-destructive"
                      aria-label={`Sposta nel cestino: ${CONSENT_KIND_LABELS[kind]}`}
                      onClick={() => setDeletingId(current.id)}
                      disabled={busyId !== null}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant={kind === "GDPR" ? "default" : "outline"}
                      className="min-h-11"
                      onClick={() => setFormKind(kind)}
                    >
                      Registra
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        {missingPrivacy ? (
          <p className="text-xs text-muted-foreground">
            Senza informativa firmata l&apos;allieva compare in «Senza consenso
            privacy» nell&apos;elenco e in «Da completare».
          </p>
        ) : null}

        {trashed.length > 0 ? (
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-11"
              onClick={() => setTrashOpen((v) => !v)}
            >
              {trashOpen
                ? "Nascondi cestino"
                : `Nel cestino (${trashed.length})`}
            </Button>
            {trashOpen ? (
              <ul className="mt-2 divide-y rounded-md border border-dashed">
                {trashed.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground line-through">
                        {isConsentKind(c.type)
                          ? CONSENT_KIND_LABELS[c.type]
                          : c.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Firmato il {formatDateShort(new Date(c.acceptedAt))} da{" "}
                        {signerLabel(c)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-11 shrink-0"
                      onClick={() => onRestore(c.id)}
                      disabled={busyId !== null}
                    >
                      {busyId === c.id ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <Undo2 className="mr-1 h-4 w-4" />
                      )}
                      Ripristina
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </CardContent>

      <ConsentFormDialog
        open={formKind !== null}
        onOpenChange={(next) => {
          if (!next) setFormKind(null)
        }}
        athleteId={athleteId}
        kind={formKind ?? "GDPR"}
        signers={signers}
      />

      <AlertDialog
        open={deletingId !== null}
        onOpenChange={(next) => {
          if (!next) setDeletingId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Spostare il consenso nel cestino?</AlertDialogTitle>
            <AlertDialogDescription>
              Il consenso non conterà più per questa allieva. Si può
              ripristinare da «Nel cestino» in questa sezione; il modulo
              allegato resta al suo posto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyId !== null}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void onConfirmDelete()
              }}
              disabled={busyId !== null}
            >
              {busyId !== null ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Sposta nel cestino
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function signerLabel(c: ConsentItem): string {
  return c.parent
    ? `${c.parent.firstName} ${c.parent.lastName} (genitore)`
    : "l'allieva"
}
