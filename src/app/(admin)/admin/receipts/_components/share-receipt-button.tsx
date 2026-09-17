"use client"

import { useRef, useState, useSyncExternalStore } from "react"
import { Loader2, Share2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { receiptPdfFileName } from "@/lib/receipts/pdf-file-name"
import { receiptPdfHref } from "@/lib/receipts/types"

import { recordReceiptShared } from "../actions"

// ─────────────────────────────────────────────────────────────────────────
// "Condividi": apre il foglio di condivisione di iOS con il PDF già dentro,
// così da iPad si manda su WhatsApp in un tocco.
//
// Non si condivide il link: la pagina della ricevuta sta dietro
// l'autenticazione admin, e chi lo riceve vedrebbe la schermata di accesso
// invece del documento. Si condivide il file.
//
// Due vincoli del browser decidono la forma di questo componente:
//
// 1. navigator.share() vuole un gesto dell'utente ancora valido. Se prima si
//    aspetta la fetch del PDF, Safari può rifiutare con NotAllowedError.
//    Perciò il file si scarica una volta sola e resta in memoria: la fetch
//    parte già al tocco del dito (onPointerDown), e se al momento del click
//    non è pronta, il primo tentativo può fallire ma il file resta pronto
//    per il tocco successivo.
// 2. la condivisione di file non c'è ovunque (Safari desktop, Firefox): il
//    tasto compare solo dove funziona davvero, verificato con canShare su un
//    file di prova. Altrove resta il download, che fa la stessa cosa in due
//    passaggi.
// ─────────────────────────────────────────────────────────────────────────

type ShareNavigator = Navigator & {
  share?: (data: ShareData) => Promise<void>
  canShare?: (data: ShareData) => boolean
}

function detectFileShareSupport(): boolean {
  if (typeof navigator === "undefined") return false
  const nav = navigator as ShareNavigator
  if (typeof nav.share !== "function" || typeof nav.canShare !== "function") {
    return false
  }
  try {
    // File di prova: canShare({ files }) è l'unico modo per sapere se questo
    // browser condivide file e non solo link
    const probe = new File(["%PDF-"], "prova.pdf", { type: "application/pdf" })
    return nav.canShare({ files: [probe] })
  } catch {
    return false
  }
}

// Rilevato una volta per pagina: useSyncExternalStore richiede uno snapshot
// stabile, e creare un File di prova a ogni render sarebbe uno spreco
let fileShareSupport: boolean | null = null

function getSupportSnapshot(): boolean {
  if (fileShareSupport === null) fileShareSupport = detectFileShareSupport()
  return fileShareSupport
}

// Il supporto non cambia durante la vita della pagina: niente a cui iscriversi
const subscribeNever = () => () => {}

// Durante il render sul server navigator non esiste: il tasto compare dopo
// l'idratazione, solo dove la condivisione di file c'è davvero
const getServerSnapshot = () => false

type Props = {
  receiptId: string
  receiptNumber: string
  athleteName: string
  // "icon" per l'elenco, "button" per il dettaglio
  variant?: "button" | "icon"
  className?: string
  // Il dettaglio se ne serve per aggiornare la riga "Condivisa dal
  // gestionale il …" senza ricaricare la pagina
  onShared?: () => void
}

export function ShareReceiptButton({
  receiptId,
  receiptNumber,
  athleteName,
  variant = "button",
  className,
  onShared,
}: Props) {
  const supported = useSyncExternalStore(
    subscribeNever,
    getSupportSnapshot,
    getServerSnapshot,
  )
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<File | null>(null)
  const pendingRef = useRef<Promise<File> | null>(null)

  const { utf8: fileName } = receiptPdfFileName({ receiptNumber, athleteName })

  function loadFile(): Promise<File> {
    if (pendingRef.current) return pendingRef.current
    const pending = fetch(receiptPdfHref(receiptId))
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Risposta ${response.status} dall'archivio`)
        }
        const blob = await response.blob()
        const file = new File([blob], fileName, { type: "application/pdf" })
        fileRef.current = file
        return file
      })
      .catch((error) => {
        // Un errore non deve impedire un secondo tentativo
        pendingRef.current = null
        throw error
      })
    pendingRef.current = pending
    return pending
  }

  // Scarica in anticipo al tocco del dito: al click successivo il file è
  // spesso già pronto e la condivisione parte senza attese
  function prefetch() {
    if (!supported || fileRef.current || pendingRef.current) return
    void loadFile().catch(() => {
      // L'errore si mostra al click, non mentre si sfiora il tasto
    })
  }

  // Il file passa al sistema: da qui in poi il destinatario lo sceglie
  // l'utente nel foglio di iOS, e il gestionale non lo vede più.
  async function share(file: File): Promise<void> {
    const nav = navigator as ShareNavigator
    try {
      // La chiamata avviene prima di qualunque await: il gesto resta valido
      await nav.share?.({ files: [file] })
    } catch (error) {
      const name = error instanceof Error ? error.name : ""
      // L'utente ha chiuso il foglio: niente da segnalare e niente da tracciare
      if (name === "AbortError") return
      if (name === "NotAllowedError") {
        toast.info("PDF pronto: tocca di nuovo «Condividi».")
        return
      }
      toast.error(
        "Condivisione non riuscita: scarica il PDF e allegalo a mano.",
      )
      return
    }

    // Traccia, senza bloccare: la condivisione è già avvenuta
    try {
      await recordReceiptShared(receiptId)
      onShared?.()
    } catch (error) {
      console.error("[receipt share] audit non registrato", error)
    }
  }

  async function handleClick() {
    if (busy) return

    // File già in memoria: si condivide subito, senza await prima della
    // chiamata, così il gesto dell'utente resta valido
    const ready = fileRef.current
    if (ready) {
      void share(ready)
      return
    }

    setBusy(true)
    try {
      const file = await loadFile()
      await share(file)
    } catch {
      toast.error(
        "Non è stato possibile preparare il PDF da condividere: riprova.",
      )
    } finally {
      setBusy(false)
    }
  }

  if (!supported) return null

  const label = `Condividi la ricevuta ${receiptNumber}`

  if (variant === "icon") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={className ?? "h-9 w-9"}
        onPointerDown={prefetch}
        onClick={handleClick}
        disabled={busy}
        aria-label={label}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Share2 className="h-4 w-4" />
        )}
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={className ?? "min-h-11 flex-1"}
      onPointerDown={prefetch}
      onClick={handleClick}
      disabled={busy}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Share2 className="h-4 w-4" />
      )}
      Condividi
    </Button>
  )
}
