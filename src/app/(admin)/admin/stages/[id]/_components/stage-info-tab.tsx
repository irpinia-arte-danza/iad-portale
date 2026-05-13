"use client"

import { useState } from "react"
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
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

import { softDeleteStage, toggleRegistrationOpen } from "../../actions"
import { StageForm } from "../../_components/stage-form"
import type { StageWithDetails } from "../../queries"

type Props = {
  stage: StageWithDetails
}

export function StageInfoTab({ stage }: Props) {
  const router = useRouter()
  const [pendingToggle, startToggleTransition] = useTransition()
  const [pendingDelete, startDeleteTransition] = useTransition()
  const [open, setOpen] = useState(stage.registrationOpen)

  function onToggle(next: boolean) {
    setOpen(next)
    startToggleTransition(async () => {
      const res = await toggleRegistrationOpen(stage.id, next)
      if (!res.ok) {
        toast.error(res.error)
        setOpen(!next) // rollback ottimistico
      } else {
        toast.success(next ? "Iscrizioni aperte" : "Iscrizioni chiuse")
        router.refresh()
      }
    })
  }

  function onDelete() {
    startDeleteTransition(async () => {
      const res = await softDeleteStage(stage.id)
      if (!res.ok) {
        toast.error(res.error)
      } else {
        toast.success("Stage cancellato")
        router.push("/admin/stages")
      }
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Dettagli stage</CardTitle>
        </CardHeader>
        <CardContent>
          <StageForm
            mode="edit"
            stageId={stage.id}
            defaultValues={{
              title: stage.title,
              description: stage.description ?? "",
              date: stage.date,
              startTime: stage.startTime,
              endTime: stage.endTime,
              location: stage.location ?? "",
              capacity: stage.capacity,
              feeEur: stage.feeCents / 100,
              registrationOpen: stage.registrationOpen,
              registrationDeadline: stage.registrationDeadline,
            }}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Iscrizioni</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="reg-open">Iscrizioni aperte</Label>
                <p className="text-xs text-muted-foreground">
                  Disattiva per congelare nuove iscrizioni
                </p>
              </div>
              <Switch
                id="reg-open"
                checked={open}
                disabled={pendingToggle || stage.deletedAt !== null}
                onCheckedChange={onToggle}
              />
            </div>
          </CardContent>
        </Card>

        {stage.deletedAt === null && (
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
                        Cancella stage
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancellare lo stage?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Verrà marcato come «Cancellato» (soft delete) e le
                      iscrizioni esistenti saranno preservate. Le iscrizioni
                      saranno chiuse automaticamente. Operazione reversibile
                      dal Cestino.
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
