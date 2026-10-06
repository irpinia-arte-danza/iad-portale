"use client"

import * as React from "react"
import {
  Download,
  Loader2,
  Pencil,
  Plus,
  ShieldAlert,
  Stethoscope,
  Trash2,
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
import { CertStatusBadge } from "@/components/medical-certificates/cert-status-badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  classifyCert,
  compareCurrentFirst,
} from "@/lib/medical-certificates/certificate-status"
import {
  MEDICAL_CERT_TYPE_LABELS,
  normalizeCertType,
  type MedicalCertType,
} from "@/lib/schemas/medical-certificate"
import {
  certRequestLabel,
  type CertRequestSummary,
} from "@/lib/medical-certificates/request-trace"
import { formatDateShort } from "@/lib/utils/format"

import {
  refreshMedicalCertSignedUrl,
  softDeleteMedicalCertificate,
} from "../medical-cert-actions"
import { MedicalCertFormDialog } from "./medical-cert-form-dialog"

type CertItem = {
  id: string
  type: string
  issueDate: Date
  expiryDate: Date
  doctorName: string | null
  notes: string | null
  filePath: string | null
  createdAt: Date
}

type Props = {
  athleteId: string
  certificates: CertItem[]
  // Quando è stato chiesto alla famiglia: lo stesso dato dell'elenco
  // Certificati
  lastRequest?: CertRequestSummary
}

export function MedicalCertSection({
  athleteId,
  certificates,
  lastRequest,
}: Props) {
  const [formOpen, setFormOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = React.useState(false)

  // Corrente = scadenza più lontana, come in lista allieve e riepilogo
  const sorted = [...certificates].sort(compareCurrentFirst)
  const latest = sorted[0] ?? null
  const history = sorted.slice(1)

  const editing =
    editingId !== null
      ? certificates.find((c) => c.id === editingId) ?? null
      : null

  function openCreate() {
    setEditingId(null)
    setFormOpen(true)
  }

  function openEdit(id: string) {
    setEditingId(id)
    setFormOpen(true)
  }

  // Il link nasce qui, al clic, e vive cinque minuti: nessuna copia salvata
  // da usare come ripiego
  async function onDownload(certId: string) {
    setDownloadingId(certId)
    try {
      const result = await refreshMedicalCertSignedUrl(certId)
      const target = result.ok ? result.data?.signedUrl : null
      if (!target) {
        toast.error(result.ok ? "URL non disponibile" : result.error)
        return
      }
      window.open(target, "_blank", "noopener,noreferrer")
    } catch (error) {
      console.error("[medical-cert] download error", error)
      toast.error("Errore download certificato")
    } finally {
      setDownloadingId(null)
    }
  }

  async function onConfirmDelete() {
    if (!deletingId) return
    setBusy(true)
    const result = await softDeleteMedicalCertificate(deletingId)
    if (result.ok) {
      toast.success("Certificato spostato nel cestino")
      setDeletingId(null)
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
            <Stethoscope className="h-5 w-5 text-muted-foreground" />
            Certificato medico
          </CardTitle>
          <CardDescription>
            {latest
              ? `Ultimo emesso il ${formatDateShort(new Date(latest.issueDate))}`
              : "Nessun certificato registrato"}
            {lastRequest ? ` · ${certRequestLabel(lastRequest)}` : ""}
          </CardDescription>
        </div>
        {latest ? null : (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" />
            Aggiungi
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {latest ? (
          <CertCard
            cert={latest}
            isLatest
            onDownload={onDownload}
            downloading={downloadingId === latest.id}
            onDelete={() => setDeletingId(latest.id)}
            onEdit={() => openEdit(latest.id)}
            onRenew={openCreate}
          />
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <ShieldAlert className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Nessun certificato medico registrato per questa allieva.
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
                : `Vedi storico (${history.length} ${history.length === 1 ? "precedente" : "precedenti"})`}
            </Button>
            {historyOpen ? (
              <div className="mt-2 space-y-2">
                {history.map((c) => (
                  <CertCard
                    key={c.id}
                    cert={c}
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

      <MedicalCertFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={editing ? "edit" : "create"}
        athleteId={athleteId}
        certId={editing?.id}
        defaults={
          editing
            ? {
                type: normalizeCertType(editing.type),
                issueDate: new Date(editing.issueDate),
                expiryDate: new Date(editing.expiryDate),
                doctorName: editing.doctorName ?? "",
                notes: editing.notes ?? "",
              }
            : undefined
        }
        hasExistingFile={!!editing?.filePath}
      />

      <AlertDialog
        open={deletingId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare il certificato?</AlertDialogTitle>
            <AlertDialogDescription>
              Il certificato verrà spostato nel cestino. Potrai ripristinarlo
              dalla sezione Cestino.
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

function CertCard({
  cert,
  isLatest,
  onDownload,
  downloading,
  onDelete,
  onEdit,
  onRenew,
}: {
  cert: CertItem
  isLatest: boolean
  onDownload: (certId: string) => Promise<void>
  downloading: boolean
  onDelete: () => void
  onEdit?: () => void
  onRenew?: () => void
}) {
  const status = classifyCert(new Date(cert.expiryDate))
  const type = normalizeCertType(cert.type) as MedicalCertType
  const hasFile = !!cert.filePath
  const showFooter = isLatest && (!!onEdit || !!onRenew)

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{MEDICAL_CERT_TYPE_LABELS[type]}</Badge>
            {!isLatest ? (
              <Badge variant="outline" className="text-xs">
                Sostituito
              </Badge>
            ) : null}
            {/* Lo stesso badge dell'elenco Certificati e della lista
                allieve: niente colore deciso qui */}
            {isLatest && status !== "missing" ? (
              <CertStatusBadge status={status} />
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Emesso {formatDateShort(new Date(cert.issueDate))} · Scade{" "}
            {formatDateShort(new Date(cert.expiryDate))}
          </p>
          {cert.doctorName ? (
            <p className="text-xs text-muted-foreground">
              Medico: {cert.doctorName}
            </p>
          ) : null}
          {cert.notes ? (
            <p className="text-xs italic text-muted-foreground">
              {cert.notes}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1">
          {hasFile ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onDownload(cert.id)}
              disabled={downloading}
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
            aria-label="Elimina certificato"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      {showFooter ? (
        <div className="mt-3 flex flex-col gap-2 border-t pt-3 sm:flex-row">
          {onEdit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="sm:flex-1"
            >
              <Pencil className="mr-1 h-4 w-4" />
              Aggiorna
            </Button>
          ) : null}
          {onRenew ? (
            <Button
              type="button"
              size="sm"
              onClick={onRenew}
              className="sm:flex-1"
            >
              <Plus className="mr-1 h-4 w-4" />
              Rinnovo certificato
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

