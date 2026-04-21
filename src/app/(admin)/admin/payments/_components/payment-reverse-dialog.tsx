"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
  paymentReverseSchema,
  type PaymentReverseValues,
} from "@/lib/schemas/payment"

import { reversePayment } from "../actions"

interface PaymentReverseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment: {
    id: string
    athleteName: string
  }
  onSuccess?: () => void
}

export function PaymentReverseDialog({
  open,
  onOpenChange,
  payment,
  onSuccess,
}: PaymentReverseDialogProps) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<PaymentReverseValues>({
    resolver: zodResolver(paymentReverseSchema),
    defaultValues: { reversalReason: "" },
  })

  function onSubmit(values: PaymentReverseValues) {
    startTransition(async () => {
      const result = await reversePayment(payment.id, values)
      if (result.ok) {
        toast.success("Pagamento stornato")
        onOpenChange(false)
        form.reset()
        onSuccess?.()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Stornare questo pagamento?</AlertDialogTitle>
          <AlertDialogDescription>
            Stai per stornare il pagamento di {payment.athleteName}. Lo status
            verrà impostato a <strong>Stornato</strong>. L&apos;operazione è
            tracciata ma non è reversibile dall&apos;interfaccia.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Form {...form}>
          <form
            id="payment-reverse-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="reversalReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo dello storno</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Es. Importo errato, duplicato, rimborso…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annulla</AlertDialogCancel>
          <Button
            type="submit"
            form="payment-reverse-form"
            disabled={isPending}
            variant="destructive"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Storno…
              </>
            ) : (
              "Storna pagamento"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
