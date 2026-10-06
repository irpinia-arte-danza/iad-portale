"use client"

import * as React from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Camera, FileUp, Loader2, Upload, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  MEDICAL_CERT_TYPE_LABELS,
  MEDICAL_CERT_TYPES,
  medicalCertSchema,
  type MedicalCertValues,
} from "@/lib/schemas/medical-certificate"
import {
  DEFAULT_EXPIRY_HINT,
  defaultExpiryFromIssue,
  isDefaultExpiry,
  shouldRefillExpiry,
} from "@/lib/medical-certificates/default-expiry"
import { useIsBelowLg } from "@/hooks/use-is-below-lg"
import { prepareCertificateFile } from "@/lib/medical-certificates/photo-resize"
import { toDateInputValue } from "@/lib/utils/format"

import {
  createMedicalCertificate,
  updateMedicalCertificate,
} from "../medical-cert-actions"

type Mode = "create" | "edit"

const MAX_BYTES = 3 * 1024 * 1024
// "Scatta una foto": su iPad e telefono apre direttamente la fotocamera
// posteriore. "Scegli un file": la galleria o i file, PDF compresi.
const ACCEPT_PHOTO = "image/*"
const ACCEPT_FILE = "image/*,application/pdf"

const TITLE: Record<Mode, string> = {
  create: "Nuovo certificato medico",
  edit: "Aggiorna certificato medico",
}
const DESCRIPTION =
  "Foto o PDF, facoltativo. La foto viene ridotta prima di caricarla."

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: Mode
  athleteId: string
  certId?: string
  defaults?: Partial<MedicalCertValues>
  hasExistingFile?: boolean
}

// Scadenza proposta a partire da una data: il calcolo sta in
// @/lib/medical-certificates/default-expiry, condiviso col form della nuova
// allieva. Qui si fa solo il passaggio fra Date (quello che tiene il form) e
// la stringa di calendario su cui lavora la funzione.
function proposedExpiry(from: Date): Date | undefined {
  const iso = defaultExpiryFromIssue(toDateInputValue(from))
  return iso ? new Date(iso) : undefined
}

export function MedicalCertFormDialog({
  open,
  onOpenChange,
  mode,
  athleteId,
  certId,
  defaults,
  hasExistingFile,
}: Props) {
  const [busy, setBusy] = React.useState(false)
  const [file, setFile] = React.useState<File | null>(null)
  const [fileError, setFileError] = React.useState<string | null>(null)
  const [preparing, setPreparing] = React.useState(false)
  const [resized, setResized] = React.useState(false)
  // Sotto 1024 il modulo sale dal basso: è il gesto di iPad e telefono
  const belowLg = useIsBelowLg()
  const photoInput = React.useRef<HTMLInputElement>(null)
  const fileInput = React.useRef<HTMLInputElement>(null)

  const form = useForm<MedicalCertValues>({
    resolver: zodResolver(medicalCertSchema),
    defaultValues: {
      type: defaults?.type ?? "NON_AGONISTICO",
      issueDate: defaults?.issueDate ?? new Date(),
      expiryDate: defaults?.expiryDate ?? proposedExpiry(new Date()),
      doctorName: defaults?.doctorName ?? "",
      notes: defaults?.notes ?? "",
    },
  })

  // useWatch e non form.watch: quest'ultimo il lint di react-hooks lo segnala
  // come non memoizzabile
  const issueDate = useWatch({ control: form.control, name: "issueDate" })

  React.useEffect(() => {
    if (open) {
      form.reset({
        type: defaults?.type ?? "NON_AGONISTICO",
        issueDate: defaults?.issueDate ?? new Date(),
        expiryDate: defaults?.expiryDate ?? proposedExpiry(new Date()),
        doctorName: defaults?.doctorName ?? "",
        notes: defaults?.notes ?? "",
      })
      setFile(null)
      setFileError(null)
      setResized(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, certId])

  // Foto o file: la foto si riduce sul dispositivo (lato lungo 2000 px,
  // JPEG), il PDF passa intatto. O esce un file pronto, o un errore chiaro:
  // mai un file a metà.
  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    // Lo stesso file si deve poter riscegliere dopo un errore
    e.target.value = ""
    setFileError(null)
    if (!picked) return

    setPreparing(true)
    const prepared = await prepareCertificateFile(picked)
    setPreparing(false)

    if (!prepared.ok) {
      setFile(null)
      setFileError(prepared.error)
      return
    }
    if (prepared.file.size > MAX_BYTES) {
      setFile(null)
      setFileError(
        prepared.file.type === "application/pdf"
          ? "Il PDF supera i 3 MB: scegline uno più leggero o scatta una foto."
          : "La foto è ancora troppo pesante: riprova più da vicino o scegli un PDF.",
      )
      return
    }
    setFile(prepared.file)
    setResized(prepared.resized)
  }

  async function onSubmit(values: MedicalCertValues) {
    setBusy(true)
    const fd = new FormData()
    fd.append("type", values.type)
    fd.append("issueDate", values.issueDate.toISOString())
    fd.append("expiryDate", values.expiryDate.toISOString())
    if (values.doctorName) fd.append("doctorName", values.doctorName)
    if (values.notes) fd.append("notes", values.notes)
    if (file) fd.append("file", file)

    const result =
      mode === "create"
        ? await createMedicalCertificate(athleteId, fd)
        : await updateMedicalCertificate(certId!, fd)

    if (result.ok) {
      toast.success(
        mode === "create"
          ? "Certificato aggiunto"
          : "Certificato aggiornato",
      )
      onOpenChange(false)
    } else {
      toast.error(result.error)
    }
    setBusy(false)
  }

  const formBody = (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        {/* La foto prima di tutto: il genitore porta il foglio in sala, e
            il gesto naturale su iPad è fotografarlo */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={busy || preparing}
              onClick={() => photoInput.current?.click()}
            >
              <Camera className="h-4 w-4" />
              Scatta una foto
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={busy || preparing}
              onClick={() => fileInput.current?.click()}
            >
              <FileUp className="h-4 w-4" />
              Scegli un file
            </Button>
          </div>
          {/* Dal Mac il certificato arriva spesso come scansione: la via
              più pulita è quella di sistema, poi si sceglie il PDF qui */}
          <p className="text-xs text-muted-foreground">
            Per una scansione pulita: app Anteprima → Scansiona documenti, poi
            scegli qui il PDF
          </p>
          {/* capture="environment": fotocamera posteriore, senza passare
              dalla galleria */}
          <input
            ref={photoInput}
            type="file"
            accept={ACCEPT_PHOTO}
            capture="environment"
            className="hidden"
            onChange={onFileChange}
          />
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPT_FILE}
            className="hidden"
            onChange={onFileChange}
          />
          {preparing ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Preparo la foto…
            </p>
          ) : null}
          {file ? (
            <p className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
              <span className="min-w-0 truncate">
                {file.name} · {(file.size / 1024).toFixed(0)} KB
                {resized ? " · ridotta" : ""}
              </span>
              <button
                type="button"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-muted"
                aria-label="Togli il file"
                onClick={() => setFile(null)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </p>
          ) : hasExistingFile ? (
            <p className="text-xs text-muted-foreground">
              C&apos;è già un file: se non ne scegli un altro resta quello.
            </p>
          ) : null}
          {fileError ? (
            <p className="text-xs text-destructive">{fileError}</p>
          ) : null}
        </div>

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              {/* Quattro tasti e non una select: si sceglie con un tocco */}
              <div
                role="radiogroup"
                aria-label="Tipo di certificato"
                className="grid grid-cols-2 gap-2"
              >
                {MEDICAL_CERT_TYPES.map((t) => (
                  <Button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={field.value === t}
                    variant={field.value === t ? "default" : "outline"}
                    className="h-11 whitespace-normal text-left leading-tight"
                    onClick={() => field.onChange(t)}
                  >
                    {MEDICAL_CERT_TYPE_LABELS[t]}
                  </Button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="issueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Emesso il</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    className="h-11"
                    value={
                      field.value ? toDateInputValue(field.value) : ""
                    }
                    onChange={(e) => {
                      const iso = e.target.value
                      const previousIso = field.value
                        ? toDateInputValue(field.value)
                        : ""
                      field.onChange(iso ? new Date(iso) : undefined)

                      // Solo in creazione: su un certificato esistente non
                      // si ricalcola niente. E solo se la scadenza è vuota
                      // o è ancora quella proposta dal rilascio
                      // precedente: una data scritta a mano resta.
                      if (mode !== "create" || !iso) return
                      const currentExpiry = form.getValues("expiryDate")
                      const currentIso = currentExpiry
                        ? toDateInputValue(currentExpiry)
                        : ""
                      if (!shouldRefillExpiry(previousIso, currentIso)) {
                        return
                      }
                      const proposed = defaultExpiryFromIssue(iso)
                      if (proposed) {
                        form.setValue("expiryDate", new Date(proposed), {
                          shouldValidate: true,
                        })
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="expiryDate"
            render={({ field }) => {
              const iso = field.value
                ? toDateInputValue(field.value)
                : ""
              // La riga compare solo quando la scadenza è ancora quella
              // proposta dal rilascio: appena Giuseppina la cambia,
              // sparisce
              const calcolata =
                mode === "create" &&
                isDefaultExpiry(
                  issueDate ? toDateInputValue(issueDate) : "",
                  iso,
                )
              return (
                <FormItem>
                  <FormLabel>Scade il</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      className="h-11"
                      value={iso}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value
                            ? new Date(e.target.value)
                            : undefined,
                        )
                      }
                    />
                  </FormControl>
                  {calcolata ? (
                    <FormDescription>{DEFAULT_EXPIRY_HINT}</FormDescription>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )
            }}
          />
        </div>

        <FormField
          control={form.control}
          name="doctorName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Medico (opzionale)</FormLabel>
              <FormControl>
                <Input
                  placeholder="es. Dr. Mario Rossi"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note (opzionale)</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  maxLength={500}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Annulla
          </Button>
          <Button type="submit" className="h-11" disabled={busy || preparing}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {mode === "create" ? "Aggiungi" : "Salva"}
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )

  // Lo stesso modulo in due cornici: dialog da 1024 in su, pannello dal
  // basso sotto. Non due moduli.
  if (belowLg) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] gap-0 overflow-y-auto p-0"
        >
          <SheetHeader className="border-b p-4 pr-12">
            <SheetTitle>{TITLE[mode]}</SheetTitle>
            <SheetDescription>{DESCRIPTION}</SheetDescription>
          </SheetHeader>
          <div className="p-4">{formBody}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{TITLE[mode]}</DialogTitle>
          <DialogDescription>{DESCRIPTION}</DialogDescription>
        </DialogHeader>
        {formBody}
      </DialogContent>
    </Dialog>
  )
}
