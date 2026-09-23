"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Download, IdCard, Loader2, Trash2, Upload } from "lucide-react"
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
import { CardStatusBadge } from "@/components/affiliations/card-status-badge"
import {
  classifyCard,
  compareCurrentFirst,
} from "@/lib/affiliations/card-status"
import { CARD_FILE_ACCEPT, cardFileError } from "@/lib/affiliations/file-rules"
import { formatDateShort } from "@/lib/utils/format"

import {
  importCardFile,
  refreshCardSignedUrl,
  softDeleteCard,
} from "../../../tessere/actions"

export type AthleteCardItem = {
  id: string
  entity: string
  cardNumber: string | null
  cardType: string | null
  cardYear: number
  issueDate: Date | null
  expiryDate: Date | null
  filePath: string | null
  fileUrl: string | null
  createdAt: Date
}

type Props = {
  athleteId: string
  entity: string
  cards: AthleteCardItem[]
}

export function EndasCardSection({ athleteId, entity, cards }: Props) {
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)

  const [uploading, setUploading] = React.useState(false)
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [historyOpen, setHistoryOpen] = React.useState(false)

  // Corrente = scadenza più lontana, come per il certificato medico. Una
  // tessera senza scadenza non scavalca mai una con la data.
  const sorted = [...cards].sort((a, b) =>
    compareCurrentFirst(
      { expiryDate: a.expiryDate ?? new Date(0), createdAt: a.createdAt },
      { expiryDate: b.expiryDate ?? new Date(0), createdAt: b.createdAt },
    ),
  )
  const latest = sorted[0] ?? null
  const history = sorted.slice(1)

  async function onUpload(file: File) {
    const error = cardFileError(file)
    if (error) {
      toast.error(error)
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.set("entity", entity)
      formData.set("file", file)
      formData.set("athleteId", athleteId)
      const result = await importCardFile(formData)
      if (result.ok) {
        toast.success(`Tessera n. ${result.data?.cardNumber} caricata`)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  async function onDownload(cardId: string, fallbackUrl: string | null) {
    setDownloadingId(cardId)
    try {
      const result = await refreshCardSignedUrl(cardId)
      const target = (result.ok ? result.data?.signedUrl : null) ?? fallbackUrl
      if (!target) {
        toast.error(result.ok ? "Link non disponibile" : result.error)
        return
      }
      window.open(target, "_blank", "noopener,noreferrer")
    } catch (error) {
      console.error("[tessera] download error", error)
      toast.error("Errore durante il download")
    } finally {
      setDownloadingId(null)
    }
  }

  async function onConfirmDelete() {
    if (!deletingId) return
    setBusy(true)
    const result = await softDeleteCard(deletingId)
    if (result.ok) {
      toast.success("Tessera spostata nel cestino")
      setDeletingId(null)
      router.refresh()
    } else {
      toast.error(result.error)
    }
    setBusy(false)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <IdCard className="h-5 w-5 text-muted-foreground" />
            Tessera {entity}
          </CardTitle>
          <CardDescription>
            {latest
              ? `Anno sociale ${latest.cardYear}`
              : "Nessuna tessera caricata"}
          </CardDescription>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={CARD_FILE_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void onUpload(file)
          }}
        />
        <Button
          size="sm"
          variant={latest ? "outline" : "default"}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-1 h-4 w-4" />
          )}
          {uploading ? "Lettura…" : latest ? "Carica" : "Carica PDF"}
        </Button>
      </CardHeader>
      <CardContent>
        {latest ? (
          <CardItem
            card={latest}
            isLatest
            onDownload={onDownload}
            downloading={downloadingId === latest.id}
            onDelete={() => setDeletingId(latest.id)}
          />
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <IdCard className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Nessuna tessera {entity} per questa allieva. Carica il PDF che
              arriva dall&apos;ente: numero, tipo e date si leggono da solo.
            </p>
          </div>
        )}

        {history.length > 0 ? (
          <div className="mt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setHistoryOpen((v) => !v)}
            >
              {historyOpen
                ? "Nascondi storico"
                : `Vedi storico (${history.length} ${
                    history.length === 1 ? "precedente" : "precedenti"
                  })`}
            </Button>
            {historyOpen ? (
              <div className="mt-2 space-y-2">
                {history.map((c) => (
                  <CardItem
                    key={c.id}
                    card={c}
                    isLatest={false}
                    onDownload={onDownload}
                    downloading={downloadingId === c.id}
                    onDelete={() => setDeletingId(c.id)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>

      <AlertDialog
        open={deletingId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare la tessera?</AlertDialogTitle>
            <AlertDialogDescription>
              La tessera verrà spostata nel cestino, insieme al suo PDF. Potrai
              ripristinarla dalla sezione Cestino.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmDelete}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function CardItem({
  card,
  isLatest,
  onDownload,
  downloading,
  onDelete,
}: {
  card: AthleteCardItem
  isLatest: boolean
  onDownload: (cardId: string, fallbackUrl: string | null) => Promise<void>
  downloading: boolean
  onDelete: () => void
}) {
  const status = classifyCard(card.expiryDate)

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-mono">
              n. {card.cardNumber ?? "—"}
            </Badge>
            {card.cardType ? (
              <Badge variant="outline">{card.cardType}</Badge>
            ) : null}
            {isLatest ? (
              <CardStatusBadge status={status} />
            ) : (
              <Badge variant="outline" className="text-xs">
                Anno {card.cardYear}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Anno sociale {card.cardYear}
            {card.issueDate
              ? ` · Iscrizione ${formatDateShort(new Date(card.issueDate))}`
              : ""}
            {card.expiryDate
              ? ` · Scade ${formatDateShort(new Date(card.expiryDate))}`
              : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          {card.filePath ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onDownload(card.id, card.fileUrl)}
              disabled={downloading}
              aria-label="Scarica la tessera"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            aria-label="Elimina la tessera"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  )
}
