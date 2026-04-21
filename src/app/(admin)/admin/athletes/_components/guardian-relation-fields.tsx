"use client"

import { useFormContext } from "react-hook-form"

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { relationshipOptions } from "@/lib/schemas/guardian"

interface GuardianRelationFieldsProps {
  lockedPrimaryContactName?: string | null
  lockedPrimaryPayerName?: string | null
}

export function GuardianRelationFields({
  lockedPrimaryContactName,
  lockedPrimaryPayerName,
}: GuardianRelationFieldsProps = {}) {
  const form = useFormContext()

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="relationship"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Relazione con l&apos;allieva</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona relazione" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {relationshipOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-3">
        <p className="text-sm font-medium">Permessi e ruoli</p>

        <FormField
          control={form.control}
          name="isPrimaryContact"
          render={({ field }) => {
            const isLocked = Boolean(lockedPrimaryContactName) && !field.value
            const checkbox = (
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={isLocked}
              />
            )
            return (
              <FormItem className="flex flex-row items-start gap-3 space-y-0">
                <FormControl>
                  {isLocked ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex">{checkbox}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        Già assegnato a {lockedPrimaryContactName}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    checkbox
                  )}
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="cursor-pointer">
                    Contatto principale
                  </FormLabel>
                  <FormDescription>
                    {isLocked
                      ? `Ruolo attualmente assegnato a ${lockedPrimaryContactName}. Modifica quella relazione per liberarlo.`
                      : "Riceve comunicazioni urgenti per primo. Solo 1 per allieva."}
                  </FormDescription>
                </div>
              </FormItem>
            )
          }}
        />

        <FormField
          control={form.control}
          name="isPrimaryPayer"
          render={({ field }) => {
            const isLocked = Boolean(lockedPrimaryPayerName) && !field.value
            const checkbox = (
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={isLocked}
              />
            )
            return (
              <FormItem className="flex flex-row items-start gap-3 space-y-0">
                <FormControl>
                  {isLocked ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex">{checkbox}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        Già assegnato a {lockedPrimaryPayerName}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    checkbox
                  )}
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="cursor-pointer">Paga le quote</FormLabel>
                  <FormDescription>
                    {isLocked
                      ? `Ruolo attualmente assegnato a ${lockedPrimaryPayerName}. Modifica quella relazione per liberarlo.`
                      : "Riceve solleciti pagamento. Solo 1 per allieva."}
                  </FormDescription>
                </div>
              </FormItem>
            )
          }}
        />

        <FormField
          control={form.control}
          name="isPickupAuthorized"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="cursor-pointer">
                  Può prelevare l&apos;allieva
                </FormLabel>
                <FormDescription>
                  Autorizzato a riprendere l&apos;allieva al termine delle lezioni.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="hasParentalAuthority"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="cursor-pointer">
                  Ha potestà genitoriale
                </FormLabel>
                <FormDescription>
                  Può firmare moduli e dare consensi per l&apos;allieva.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}
