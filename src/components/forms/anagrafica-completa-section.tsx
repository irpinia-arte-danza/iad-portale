"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { useFormContext, type FieldValues, type Path } from "react-hook-form"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

interface AnagraficaCompletaSectionProps {
  personLabel?: string
  showDateOfBirth?: boolean
}

export function AnagraficaCompletaSection<T extends FieldValues>({
  personLabel: _personLabel = "persona",
  showDateOfBirth = false,
}: AnagraficaCompletaSectionProps) {
  const [open, setOpen] = useState(false)
  const form = useFormContext<T>()

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-foreground/80 transition-colors">
        {open ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        Anagrafica completa (opzionale)
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pt-4">
        {showDateOfBirth && (
          <FormField
            control={form.control}
            name={"dateOfBirth" as Path<T>}
            render={({ field }) => {
              const raw: unknown = field.value
              const displayValue =
                raw instanceof Date
                  ? raw.toISOString().split("T")[0]
                  : typeof raw === "string"
                    ? raw
                    : ""
              return (
                <FormItem>
                  <FormLabel>Data di nascita</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      autoComplete="bday"
                      value={displayValue}
                      onChange={(e) => {
                        const val = e.target.value
                        field.onChange(val ? new Date(val) : undefined)
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )
            }}
          />
        )}

        <FormField
          control={form.control}
          name={"fiscalCode" as Path<T>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Codice fiscale</FormLabel>
              <FormControl>
                <Input
                  placeholder="16 caratteri — es. RSSMRA85M01H501Z"
                  autoComplete="off"
                  maxLength={16}
                  className="uppercase"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-[1fr_100px]">
          <FormField
            control={form.control}
            name={"placeOfBirth" as Path<T>}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Luogo di nascita</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Avellino"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={"provinceOfBirth" as Path<T>}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prov.</FormLabel>
                <FormControl>
                  <Input
                    placeholder="AV"
                    maxLength={2}
                    className="uppercase"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-3">
            Residenza
          </h4>

          <div className="grid gap-4 sm:grid-cols-[1fr_120px] mb-4">
            <FormField
              control={form.control}
              name={"residenceStreet" as Path<T>}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Via</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Via Cervinaro"
                      autoComplete="address-line1"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={"residenceNumber" as Path<T>}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Civico</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="14"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_100px_120px]">
            <FormField
              control={form.control}
              name={"residenceCity" as Path<T>}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Città</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Montella"
                      autoComplete="address-level2"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={"residenceProvince" as Path<T>}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prov.</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="AV"
                      maxLength={2}
                      className="uppercase"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={"residenceCap" as Path<T>}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CAP</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="83048"
                      maxLength={5}
                      inputMode="numeric"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
