"use client"

import { useSyncExternalStore } from "react"

// ─────────────────────────────────────────────────────────────────────────
// Questo browser condivide FILE, non solo link?
//
// Serve in due posti: al tasto "Condividi", che esiste solo dove funziona, e
// alle azioni della ricevuta, che su iPad mettono Condividi davanti all'invio
// per email — è da lì che Giuseppina consegna quasi sempre, su WhatsApp.
//
// canShare({ files }) su un file di prova è l'unico modo di saperlo: la
// presenza di navigator.share non basta, Safari desktop lo ha ma rifiuta i
// file.
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
    const probe = new File(["%PDF-"], "prova.pdf", { type: "application/pdf" })
    return nav.canShare({ files: [probe] })
  } catch {
    return false
  }
}

// Rilevato una volta per pagina: useSyncExternalStore vuole uno snapshot
// stabile, e creare un File di prova a ogni render sarebbe uno spreco
let fileShareSupport: boolean | null = null

function getSupportSnapshot(): boolean {
  if (fileShareSupport === null) fileShareSupport = detectFileShareSupport()
  return fileShareSupport
}

// Il supporto non cambia durante la vita della pagina: niente a cui iscriversi
const subscribeNever = () => () => {}

// Durante il render sul server navigator non esiste: si decide dopo
// l'idratazione, così il markup del server e quello del client coincidono
const getServerSnapshot = () => false

export function useFileShareSupport(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    getSupportSnapshot,
    getServerSnapshot,
  )
}
