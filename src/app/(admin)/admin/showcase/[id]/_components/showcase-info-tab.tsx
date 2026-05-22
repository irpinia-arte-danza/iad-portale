"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Loader2, Trash2 } from "lucide-react"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { softDeleteShowcase } from "../../actions"
import { ShowcaseForm } from "../../_components/showcase-form"
import type { ShowcaseWithDetails } from "../../queries"

type Props = {
  showcase: ShowcaseWithDetails
}

const EUR = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
})

const DATE_IT = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

export function ShowcaseInfoTab({ showcase }: Props) {
  const router = useRouter()
  const [pendingDelete, startDeleteTransition] = useTransition()

  function onDelete() {
    startDeleteTransition(async () => {
      const res = await softDeleteShowcase(showcase.id)
      if (!res.ok) {
        toast.error(res.error)
      } else {
        toast.success("Saggio cancellato")
        router.push("/admin/showcase")
      }
    })
  }

  const total =
    (showcase.firstInstallmentCents + showcase.secondInstallmentCents) / 100

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Dettagli saggio</CardTitle>
        </CardHeader>
        <CardContent>
          <ShowcaseForm
            mode="edit"
            showcaseId={showcase.id}
            defaultValues={{
              title: showcase.title,
              description: showcase.description ?? "",
              date: showcase.date,
              location: showcase.location ?? "",
              rehearsalDate: showcase.rehearsalDate,
              firstInstallmentEur: showcase.firstInstallmentCents / 100,
              secondInstallmentEur: showcase.secondInstallmentCents / 100,
              firstDeadline: showcase.firstDeadline,
              secondDeadline: showcase.secondDeadline,
            }}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Riepilogo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Totale quota</span>
              <span className="font-mono font-medium">
                {EUR.format(total)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Caparra</span>
              <span className="font-mono">
                {EUR.format(showcase.firstInstallmentCents / 100)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>entro</span>
              <span>{DATE_IT.format(showcase.firstDeadline)}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-muted-foreground">Saldo</span>
              <span className="font-mono">
                {EUR.format(showcase.secondInstallmentCents / 100)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>entro</span>
              <span>{DATE_IT.format(showcase.secondDeadline)}</span>
            </div>
            {showcase.rehearsalDate ? (
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Prove generali</span>
                <span>{DATE_IT.format(showcase.rehearsalDate)}</span>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {showcase.deletedAt === null && (
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-base text-destructive">
                Zona pericolosa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={pendingDelete}
                  >
                    {pendingDelete ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cancellazione…
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Cancella saggio
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Cancellare il saggio?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Verrà marcato come «Cancellato» (soft delete). Le
                      partecipazioni e gli storici di pagamento restano
                      intatti. Operazione reversibile dal Cestino. Blocca se
                      esistono pagamenti già registrati.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete}>
                      Cancella
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
