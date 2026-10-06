"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { formatEuro } from "@/lib/utils/format"

import {
  cancelEnrollment,
  type CancelEnrollmentPreview,
} from "../enrollments-actions"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  enrollment: { id: string; courseName: string }
  // Riepilogo già chiesto al server da chi apre il dialog: qui non si fetcha
  // dentro un effetto, si mostra quello che è stato letto al clic
  preview: CancelEnrollmentPreview
}

// Annullamento di un'iscrizione sbagliata. Il dialog dichiara PRIMA della
// conferma tutto quello che sparirà — rate e, quando è l'ultima iscrizione
// dell'anno, anche il contributo di iscrizione — e lo chiede al server, con le
// stesse funzioni che poi eseguono: non può promettere una cosa e farne
// un'altra.
export function CancelEnrollmentDialog({
  open,
  onOpenChange,
  enrollment,
  preview,
}: Props) {
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)

  async function onConfirm() {
    setBusy(true)
    const result = await cancelEnrollment(enrollment.id)
    if (result.ok) {
      const rate = result.data?.removedSchedules ?? 0
      toast.success("Iscrizione annullata", {
        description:
          rate > 0
            ? `${rate} ${rate === 1 ? "rata eliminata" : "rate eliminate"}${
                result.data?.feeRemoved
                  ? ", contributo di iscrizione compreso"
                  : ""
              }. La trovi nel Cestino.`
            : "La trovi nel Cestino.",
      })
      onOpenChange(false)
      router.refresh()
    } else {
      toast.error(result.error)
    }
    setBusy(false)
  }

  const blocked = preview.blocker !== null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {blocked
              ? "Non si può annullare"
              : `Annullare l'iscrizione a ${enrollment.courseName}?`}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {blocked ? (
                <p className="flex items-start gap-2 text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{preview.blocker}</span>
                </p>
              ) : (
                <>
                  <p>
                    Usalo quando l&apos;iscrizione è stata inserita per errore:
                    verrà trattata come se non fosse mai stata fatta.
                  </p>
                  <ul className="list-disc space-y-1 pl-5">
                    <li>
                      {preview.removableCount === 0
                        ? "Non ci sono rate da eliminare."
                        : `Verranno eliminate ${preview.removableCount} ${
                            preview.removableCount === 1
                              ? "rata non pagata"
                              : "rate non pagate"
                          }, per ${formatEuro(preview.removableCents)}.`}
                    </li>
                    {preview.associationFee ? (
                      <li>
                        Verrà eliminato anche il{" "}
                        <strong>
                          contributo di iscrizione{" "}
                          {preview.associationFee.label}
                        </strong>{" "}
                        ({formatEuro(preview.associationFee.amountCents)}): era
                        l&apos;ultima iscrizione dell&apos;anno.
                      </li>
                    ) : null}
                    {preview.wasWithdrawn ? (
                      <li>
                        L&apos;iscrizione risulta ritirata: annullandola
                        sparisce anche il ritiro.
                      </li>
                    ) : null}
                    <li>
                      Finisce nel <strong>Cestino</strong>: si può
                      ripristinare, con le sue rate.
                    </li>
                    <li>
                      Dopo l&apos;annullamento l&apos;allieva si può
                      reiscrivere allo stesso corso.
                    </li>
                  </ul>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>
            {blocked ? "Chiudi" : "Annulla"}
          </AlertDialogCancel>
          {blocked ? null : (
            <Button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Annullamento…
                </>
              ) : (
                "Annulla l'iscrizione"
              )}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
