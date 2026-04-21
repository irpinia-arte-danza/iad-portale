"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, UserPlus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  adminInviteSchema,
  type AdminInviteValues,
} from "@/lib/schemas/admin-settings"

import { inviteAdmin } from "../actions"

export function AdminInviteForm() {
  const [isPending, startTransition] = useTransition()

  const form = useForm<AdminInviteValues>({
    resolver: zodResolver(adminInviteSchema),
    defaultValues: { email: "", firstName: "", lastName: "" },
  })

  function onSubmit(values: AdminInviteValues) {
    startTransition(async () => {
      const res = await inviteAdmin(values)
      if (res.ok) {
        toast.success(`Invito inviato a ${res.data?.email}`)
        form.reset({ email: "", firstName: "", lastName: "" })
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome (opzionale)</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cognome (opzionale)</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email del nuovo admin</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="mr-1 h-4 w-4" />
          )}
          Invia invito
        </Button>
      </form>
    </Form>
  )
}
