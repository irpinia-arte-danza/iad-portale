"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useIsBelowLg } from "@/hooks/use-is-below-lg"

import { attachConsentFile } from "../consent-actions"
import { useConsentFilePicker } from "./consent-file-picker"

export type AttachableConsent = { id: string; label: string }

type Props = {
  // Il consenso dalla cui riga si è partiti, o null a dialog chiuso
  consentId: string | null
  onClose: () => void
  athleteId: string
  // I consensi dell'allieva ancora senza modulo, compreso quello di partenza
  candidates: AttachableConsent[]
}

const TITLE = "Allega il modulo firmato"
const DESCRIPTION =
  "Foto o PDF del modulo. Se copre anche altri consensi di questa allieva, spuntali: il file è uno solo."

// ─────────────────────────────────────────────────────────────────────────
// «Allega modulo»: il consenso è già registrato, il foglio arriva dopo.
// Stessa scelta del file del dialog di registrazione; le caselle sono gli
// altri consensi della stessa allieva ancora senza modulo. Niente sorelle:
// ognuna ha il suo.
// ─────────────────────────────────────────────────────────────────────────
export function ConsentAttachDialog(props: Props) {
  // Si rimonta a ogni apertura: caselle e file ripartono da capo senza
  // effetti che azzerano lo stato
  return <AttachDialogBody key={props.consentId ?? "chiuso"} {...props} />
}

function AttachDialogBody({ consentId, onClose, athleteId, candidates }: Props) {
  const open = consentId !== null
  const [busy, setBusy] = React.useState(false)
  const [selected, setSelected] = React.useState<string[]>(
    consentId ? [consentId] : [],
  )
  const picker = useConsentFilePicker(busy, "Modulo firmato")
  const belowLg = useIsBelowLg()

  function handleOpenChange(next: boolean) {
    if (!next) onClose()
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!picker.file || selected.length === 0) return
    setBusy(true)
    const fd = new FormData()
    for (const id of selected) fd.append("consentIds", id)
    fd.append("file", picker.file)
    const result = await attachConsentFile(athleteId, fd)
    if (result.ok) {
      const n = result.data?.attached ?? 1
      toast.success(
        n === 1 ? "Modulo allegato" : `Modulo allegato a ${n} consensi`,
      )
      onClose()
    } else {
      toast.error(result.error)
    }
    setBusy(false)
  }

  const body = (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {picker.element}

      <div className="space-y-2">
        <p className="text-sm font-medium">Consensi che il modulo copre</p>
        <div className="grid gap-1">
          {candidates.map((c) => {
            const checked = selected.includes(c.id)
            return (
              <label
                key={c.id}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 text-sm"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(next) =>
                    setSelected((current) =>
                      next === true
                        ? [...current, c.id]
                        : current.filter((id) => id !== c.id),
                    )
                  }
                />
                {c.label}
              </label>
            )
          })}
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          disabled={busy}
        >
          Annulla
        </Button>
        <Button
          type="submit"
          className="h-11"
          disabled={
            busy || picker.preparing || !picker.file || selected.length === 0
          }
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Caricamento...
            </>
          ) : (
            "Allega"
          )}
        </Button>
      </DialogFooter>
    </form>
  )

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
          <div className="p-4">{body}</div>
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
        {body}
      </DialogContent>
    </Dialog>
  )
}
