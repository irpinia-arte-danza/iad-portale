"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea"

import {
  enrollmentUpdateSchema,
  type EnrollmentUpdateValues,
} from "@/lib/schemas/enrollment"

import { updateEnrollment } from "../enrollments-actions"

interface EnrollmentEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  enrollment: {
    id: string
    notes: string | null
    courseName: string
  }
  onSuccess?: () => void
}

export function EnrollmentEditDialog({
  open,
  onOpenChange,
  enrollment,
  onSuccess,
}: EnrollmentEditDialogProps) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<EnrollmentUpdateValues>({
    resolver: zodResolver(enrollmentUpdateSchema),
    defaultValues: {
      notes: enrollment.notes ?? "",
    },
  })

  function onSubmit(values: EnrollmentUpdateValues) {
    startTransition(async () => {
      const result = await updateEnrollment(enrollment.id, values)
      if (result.ok) {
        toast.success("Note aggiornate")
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifica note</DialogTitle>
          <DialogDescription>
            Aggiorna le note per l&apos;iscrizione a {enrollment.courseName}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Es. entra a febbraio, salta luglio…"
                      rows={3}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  "Salva"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
