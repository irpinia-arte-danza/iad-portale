"use client"

import * as React from "react"
import { Camera, FileUp, Loader2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CONSENT_FILE_MAX_BYTES } from "@/lib/consents/file-rules"
import { prepareCertificateFile } from "@/lib/medical-certificates/photo-resize"

// "Scatta una foto": fotocamera posteriore. "Scegli un file": galleria o
// file, PDF compresi. Come per il certificato medico.
const ACCEPT_PHOTO = "image/*"
const ACCEPT_FILE = "image/*,application/pdf"

// ─────────────────────────────────────────────────────────────────────────
// La scelta del modulo firmato, una sola: la usano il dialog che registra
// un consenso e quello che allega il modulo a consensi già registrati.
// ─────────────────────────────────────────────────────────────────────────
export function useConsentFilePicker(busy: boolean, label?: string) {
  const [file, setFile] = React.useState<File | null>(null)
  const [fileError, setFileError] = React.useState<string | null>(null)
  const [preparing, setPreparing] = React.useState(false)
  const [resized, setResized] = React.useState(false)
  const photoInput = React.useRef<HTMLInputElement>(null)
  const fileInput = React.useRef<HTMLInputElement>(null)

  function reset() {
    setFile(null)
    setFileError(null)
    setResized(false)
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

  const element = (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        {label ?? "Modulo firmato (facoltativo)"}
      </p>
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
  )

  return { file, preparing, reset, element }
}
