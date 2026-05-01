"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Upload } from "lucide-react"
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  MEDICAL_CERT_TYPE_LABELS,
  MEDICAL_CERT_TYPES,
  medicalCertSchema,
  type MedicalCertValues,
} from "@/lib/schemas/medical-certificate"
import { toDateInputValue } from "@/lib/utils/format"

import {
  createMedicalCertificate,
  updateMedicalCertificate,
} from "../medical-cert-actions"

type Mode = "create" | "edit"

const MAX_BYTES = 3 * 1024 * 1024
const ACCEPT = ".pdf,.jpg,.jpeg,.png"
const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png"]

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: Mode
  athleteId: string
  certId?: string
  defaults?: Partial<MedicalCertValues>
  hasExistingFile?: boolean
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

function addOneYearSafe(date: Date): Date {
  const targetYear = date.getFullYear() + 1
  if (date.getMonth() === 1 && date.getDate() === 29 && !isLeapYear(targetYear)) {
    return new Date(targetYear, 1, 28)
  }
  return new Date(targetYear, date.getMonth(), date.getDate())
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

  const form = useForm<MedicalCertValues>({
    resolver: zodResolver(medicalCertSchema),
    defaultValues: {
      type: defaults?.type ?? "NON_AGONISTICO",
      issueDate: defaults?.issueDate ?? new Date(),
      expiryDate:
        defaults?.expiryDate ??
        addOneYearSafe(new Date()),
      doctorName: defaults?.doctorName ?? "",
      notes: defaults?.notes ?? "",
    },
  })

  React.useEffect(() => {
    if (open) {
      form.reset({
        type: defaults?.type ?? "NON_AGONISTICO",
        issueDate: defaults?.issueDate ?? new Date(),
        expiryDate:
          defaults?.expiryDate ??
          addOneYearSafe(new Date()),
        doctorName: defaults?.doctorName ?? "",
        notes: defaults?.notes ?? "",
      })
      setFile(null)
      setFileError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, certId])

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    setFileError(null)
    if (!f) {
      setFile(null)
      return
    }
    if (f.size > MAX_BYTES) {
      setFileError("File troppo grande (max 3 MB)")
      setFile(null)
      e.target.value = ""
      return
    }
    if (!ALLOWED_MIME.includes(f.type)) {
      setFileError("Formato non supportato (PDF, JPEG, PNG)")
      setFile(null)
      e.target.value = ""
      return
    }
    setFile(f)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? "Nuovo certificato medico"
              : "Aggiorna certificato medico"}
          </DialogTitle>
          <DialogDescription>
            File opzionale (PDF, JPEG, PNG, max 3 MB). Conservato in archivio
            cifrato.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MEDICAL_CERT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {MEDICAL_CERT_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                        value={
                          field.value ? toDateInputValue(field.value) : ""
                        }
                        onChange={(e) => {
                          const newIssue = e.target.value
                            ? new Date(e.target.value)
                            : undefined
                          field.onChange(newIssue)
                          // Auto-suggest expiry = issue + 1 anno se non già impostato manualmente
                          if (newIssue) {
                            const currentExpiry = form.getValues("expiryDate")
                            if (
                              !currentExpiry ||
                              currentExpiry <= newIssue
                            ) {
                              form.setValue(
                                "expiryDate",
                                addOneYearSafe(newIssue),
                              )
                            }
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scade il</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={
                          field.value ? toDateInputValue(field.value) : ""
                        }
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? new Date(e.target.value)
                              : undefined,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
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

            <div className="space-y-2">
              <label className="text-sm font-medium">
                File certificato (opzionale)
              </label>
              <Input
                type="file"
                accept={ACCEPT}
                onChange={onFileChange}
                disabled={busy}
              />
              {hasExistingFile && !file ? (
                <p className="text-xs text-muted-foreground">
                  File esistente: lascia vuoto per mantenerlo invariato.
                </p>
              ) : null}
              {file ? (
                <p className="text-xs text-muted-foreground">
                  Selezionato: {file.name} ({(file.size / 1024).toFixed(0)} KB)
                </p>
              ) : null}
              {fileError ? (
                <p className="text-xs text-destructive">{fileError}</p>
              ) : null}
            </div>

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
              <Button type="submit" disabled={busy}>
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
      </DialogContent>
    </Dialog>
  )
}
