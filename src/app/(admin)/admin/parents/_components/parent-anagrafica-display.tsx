"use client"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { computeAge } from "@/lib/utils/date-helpers"

interface ParentAnagraficaDisplayProps {
  parent: {
    firstName: string
    lastName: string
    dateOfBirth: Date | null
    fiscalCode: string | null
    email: string | null
    phone: string | null
    placeOfBirth: string | null
    provinceOfBirth: string | null
    residenceStreet: string | null
    residenceNumber: string | null
    residenceCity: string | null
    residenceProvince: string | null
    residenceCap: string | null
    receivesEmailCommunications: boolean
    remindersEnabled: boolean
  }
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

export function ParentAnagraficaDisplay({
  parent,
}: ParentAnagraficaDisplayProps) {
  const age = computeAge(parent.dateOfBirth)

  const hasAnagraficaCompleta = !!(
    parent.fiscalCode ||
    parent.placeOfBirth ||
    parent.residenceStreet ||
    parent.residenceCity
  )

  const residenza = [
    parent.residenceStreet && parent.residenceNumber
      ? `${parent.residenceStreet}, ${parent.residenceNumber}`
      : parent.residenceStreet || parent.residenceNumber,
    parent.residenceCap,
    parent.residenceCity
      ? `${parent.residenceCity}${
          parent.residenceProvince ? ` (${parent.residenceProvince})` : ""
        }`
      : null,
  ]
    .filter(Boolean)
    .join(" — ")

  const luogoNascita = parent.placeOfBirth
    ? `${parent.placeOfBirth}${
        parent.provinceOfBirth ? ` (${parent.provinceOfBirth})` : ""
      }`
    : null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Anagrafica</CardTitle>
            <CardDescription>
              {age !== null ? `${age} anni` : "Data di nascita non indicata"}
              {parent.dateOfBirth
                ? ` · Nato il ${formatDate(parent.dateOfBirth)}`
                : ""}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-1">
            {parent.receivesEmailCommunications ? (
              <Badge variant="secondary">Email: on</Badge>
            ) : (
              <Badge variant="outline">Email: off</Badge>
            )}
            {parent.remindersEnabled ? (
              <Badge variant="secondary">Solleciti: on</Badge>
            ) : (
              <Badge variant="outline">Solleciti: off</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          {parent.email && (
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="break-all">{parent.email}</dd>
            </div>
          )}
          {parent.phone && (
            <div>
              <dt className="text-xs text-muted-foreground">Telefono</dt>
              <dd className="font-mono">{parent.phone}</dd>
            </div>
          )}
        </dl>

        {hasAnagraficaCompleta ? (
          <dl className="grid gap-3 sm:grid-cols-2 text-sm border-t pt-4">
            {parent.fiscalCode && (
              <div>
                <dt className="text-xs text-muted-foreground">Codice fiscale</dt>
                <dd className="font-mono">{parent.fiscalCode}</dd>
              </div>
            )}
            {luogoNascita && (
              <div>
                <dt className="text-xs text-muted-foreground">
                  Luogo di nascita
                </dt>
                <dd>{luogoNascita}</dd>
              </div>
            )}
            {residenza && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Residenza</dt>
                <dd>{residenza}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground italic border-t pt-4">
            Anagrafica completa non ancora compilata. Modifica il genitore per
            aggiungere codice fiscale, luogo di nascita e residenza.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
