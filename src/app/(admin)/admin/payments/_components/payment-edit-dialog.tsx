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
import { Textarea } from "@/components/ui/textarea"
import {
  paymentUpdateSchema,
  type PaymentUpdateValues,
} from "@/lib/schemas/payment"

import { updatePayment } from "../actions"

interface PaymentEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment: {
    id: string
    notes: string | null
    athleteName: string
  }
  onSuccess?: () => void
}

export function PaymentEditDialog({
  open,
  onOpenChange,
  payment,
  onSuccess,
}: PaymentEditDialogProps) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<PaymentUpdateValues>({
    resolver: zodResolver(paymentUpdateSchema),
    defaultValues: { notes: payment.notes ?? "" },
  })

  function onSubmit(values: PaymentUpdateValues) {
    startTransition(async () => {
      const result = await updatePayment(payment.id, values)
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
            Pagamento di {payment.athleteName}. Solo il campo note è
            modificabile: per correggere altri dati, storna il pagamento e
            registra quello corretto.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id="payment-edit-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="Note interne sul pagamento…"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Annulla
          </Button>
          <Button
            type="submit"
            form="payment-edit-form"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvataggio…
              </>
            ) : (
              "Salva"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
