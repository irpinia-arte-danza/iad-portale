"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Camera, FileUp, Loader2, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { useIsBelowLg } from "@/hooks/use-is-below-lg"
import { CONSENT_FILE_MAX_BYTES } from "@/lib/consents/file-rules"
import { prepareCertificateFile } from "@/lib/medical-certificates/photo-resize"
import {
  CONSENT_KIND_LABELS,
  CONSENT_KINDS,
  consentSchema,
  type ConsentKind,
  type ConsentValues,
} from "@/lib/schemas/consent"
import { toDateInputValue } from "@/lib/utils/format"

import { registerConsents } from "../consent-actions"

// Chi può aver firmato: i genitori collegati e, se maggiorenne, l'allieva
export type ConsentSigner = { value: string; label: string }

// "Scatta una foto": fotocamera posteriore. "Scegli un file": galleria o
// file, PDF compresi. Come per il certificato medico.
const ACCEPT_PHOTO = "image/*"
const ACCEPT_FILE = "image/*,application/pdf"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  athleteId: string
  // Il tipo con cui si apre: dalla riga «Registra» del consenso che manca
  kind: ConsentKind
  signers: ConsentSigner[]
}

const TITLE = "Registra un consenso cartaceo"
const DESCRIPTION =
  "Si segna quando è stato firmato e da chi. Il modulo si può allegare: foto o PDF."

export function ConsentFormDialog({
  open,
  onOpenChange,
  athleteId,
  kind,
  signers,
}: Props) {
  const [busy, setBusy] = React.useState(false)
  const [file, setFile] = React.useState<File | null>(null)
  const [fileError, setFileError] = React.useState<string | null>(null)
  const [preparing, setPreparing] = React.useState(false)
  const [resized, setResized] = React.useState(false)
  const photoInput = React.useRef<HTMLInputElement>(null)
  const fileInput = React.useRef<HTMLInputElement>(null)
  // Sotto 1024 il modulo sale dal basso: è il gesto di iPad e telefono
  const belowLg = useIsBelowLg()

  const defaults = React.useCallback(
    (): ConsentValues => ({
      kinds: [kind],
      alsoFor: [],
      signedOn: new Date(),
      signedBy: signers[0]?.value ?? "",
      notes: "",
    }),
    [kind, signers],
  )

  const form = useForm<ConsentValues>({
    resolver: zodResolver(consentSchema),
    defaultValues: defaults(),
  })

  React.useEffect(() => {
    if (open) form.reset(defaults())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kind])

  // Alla chiusura il file scelto si dimentica: alla prossima apertura il
  // dialog riparte vuoto
  function handleOpenChange(next: boolean) {
    if (!next) {
      setFile(null)
      setFileError(null)
      setResized(false)
    }
    onOpenChange(next)
  }

  // Stessa preparazione del certificato medico: la foto si riduce sul
  // dispositivo (lato lungo 2000 px, JPEG), il PDF passa intatto
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
    if (prepared.file.size > CONSENT_FILE_MAX_BYTES) {
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

  async function onSubmit(values: ConsentValues) {
    setBusy(true)
    const fd = new FormData()
    for (const k of values.kinds) fd.append("kinds", k)
    // Niente alsoFor: ogni sorella ha il proprio modulo, e si registra dalla
    // sua scheda. L'azione lo saprebbe fare, il dialog non lo propone.
    fd.append("signedOn", values.signedOn.toISOString())
    fd.append("signedBy", values.signedBy)
    if (values.notes) fd.append("notes", values.notes)
    if (file) fd.append("file", file)

    const result = await registerConsents(athleteId, fd)
    if (result.ok) {
      const n = result.data?.created ?? 1
      toast.success(
        n === 1 ? "Consenso registrato" : `${n} consensi registrati`,
      )
      handleOpenChange(false)
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
        {/* Il foglio prima di tutto, come per il certificato */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Modulo firmato (facoltativo)</p>
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
          <p className="text-xs text-muted-foreground">
            Per una scansione pulita: app Anteprima → Scansiona documenti, poi
            scegli qui il PDF
          </p>
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
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-muted"
                aria-label="Togli il file"
                onClick={() => setFile(null)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </p>
          ) : null}
          {fileError ? (
            <p className="text-xs text-destructive">{fileError}</p>
          ) : null}
        </div>

        <FormField
          control={form.control}
          name="kinds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Consensi che il modulo copre</FormLabel>
              <div className="grid gap-1">
                {CONSENT_KINDS.map((k) => {
                  const checked = field.value.includes(k)
                  return (
                    <label
                      key={k}
                      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 text-sm"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) =>
                          field.onChange(
                            next === true
                              ? [...field.value, k]
                              : field.value.filter((v) => v !== k),
                          )
                        }
                      />
                      {CONSENT_KIND_LABELS[k]}
                    </label>
                  )
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="signedOn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Firmato il</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  className="h-11"
                  max={toDateInputValue(new Date())}
                  value={field.value ? toDateInputValue(field.value) : ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? new Date(e.target.value) : undefined,
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="signedBy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Firmato da</FormLabel>
              {signers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  È minorenne e non ha genitori collegati: collega prima un
                  genitore, poi registra la firma.
                </p>
              ) : (
                <div
                  role="radiogroup"
                  aria-label="Chi ha firmato"
                  className="grid gap-2"
                >
                  {signers.map((s) => (
                    <Button
                      key={s.value}
                      type="button"
                      role="radio"
                      aria-checked={field.value === s.value}
                      variant={field.value === s.value ? "default" : "outline"}
                      className="h-11 justify-start whitespace-normal text-left leading-tight"
                      onClick={() => field.onChange(s.value)}
                    >
                      {s.label}
                    </Button>
                  ))}
                </div>
              )}
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
                  placeholder="es. modulo nel raccoglitore 2026/27"
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
            onClick={() => handleOpenChange(false)}
            disabled={busy}
          >
            Annulla
          </Button>
          <Button
            type="submit"
            className="h-11"
            disabled={busy || preparing || signers.length === 0}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvataggio...
              </>
            ) : (
              "Registra"
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
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] gap-0 overflow-y-auto p-0"
        >
          <SheetHeader className="border-b p-4 pr-12">
            <SheetTitle>{TITLE}</SheetTitle>
            <SheetDescription>{DESCRIPTION}</SheetDescription>
          </SheetHeader>
          <div className="p-4">{formBody}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{TITLE}</DialogTitle>
          <DialogDescription>{DESCRIPTION}</DialogDescription>
        </DialogHeader>
        {formBody}
      </DialogContent>
    </Dialog>
  )
}
