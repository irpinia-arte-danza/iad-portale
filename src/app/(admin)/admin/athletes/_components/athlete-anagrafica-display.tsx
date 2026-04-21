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

interface AthleteAnagraficaDisplayProps {
  athlete: {
    firstName: string
    lastName: string
    dateOfBirth: Date | null
    gender: "F" | "M" | "OTHER"
    status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "WITHDRAWN"
    fiscalCode: string | null
    placeOfBirth: string | null
    provinceOfBirth: string | null
    residenceStreet: string | null
    residenceNumber: string | null
    residenceCity: string | null
    residenceProvince: string | null
    residenceCap: string | null
    instructorNotes: string | null
  }
}

const GENDER_LABELS: Record<
  AthleteAnagraficaDisplayProps["athlete"]["gender"],
  string
> = {
  F: "Femmina",
  M: "Maschio",
  OTHER: "Altro",
}

const STATUS_LABELS: Record<
  AthleteAnagraficaDisplayProps["athlete"]["status"],
  string
> = {
  TRIAL: "Prova",
  ACTIVE: "Attiva",
  SUSPENDED: "Sospesa",
  WITHDRAWN: "Ritirata",
}

const STATUS_VARIANTS: Record<
  AthleteAnagraficaDisplayProps["athlete"]["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  TRIAL: "secondary",
  ACTIVE: "default",
  SUSPENDED: "outline",
  WITHDRAWN: "destructive",
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

export function AthleteAnagraficaDisplay({
  athlete,
}: AthleteAnagraficaDisplayProps) {
  const age = computeAge(athlete.dateOfBirth)
  const hasAnagraficaCompleta = !!(
    athlete.fiscalCode ||
    athlete.placeOfBirth ||
    athlete.residenceStreet ||
    athlete.residenceCity
  )

  const residenza = [
    athlete.residenceStreet && athlete.residenceNumber
      ? `${athlete.residenceStreet}, ${athlete.residenceNumber}`
      : athlete.residenceStreet || athlete.residenceNumber,
    athlete.residenceCap,
    athlete.residenceCity
      ? `${athlete.residenceCity}${
          athlete.residenceProvince ? ` (${athlete.residenceProvince})` : ""
        }`
      : null,
  ]
    .filter(Boolean)
    .join(" — ")

  const luogoNascita = athlete.placeOfBirth
    ? `${athlete.placeOfBirth}${
        athlete.provinceOfBirth ? ` (${athlete.provinceOfBirth})` : ""
      }`
    : null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Anagrafica</CardTitle>
            <CardDescription>
              {age !== null ? `${age} anni` : "—"} ·{" "}
              {GENDER_LABELS[athlete.gender]}
              {athlete.dateOfBirth
                ? ` · Nata il ${formatDate(athlete.dateOfBirth)}`
                : ""}
            </CardDescription>
          </div>
          <Badge variant={STATUS_VARIANTS[athlete.status]}>
            {STATUS_LABELS[athlete.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasAnagraficaCompleta ? (
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            {athlete.fiscalCode && (
              <div>
                <dt className="text-xs text-muted-foreground">Codice fiscale</dt>
                <dd className="font-mono">{athlete.fiscalCode}</dd>
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
          <p className="text-sm text-muted-foreground italic">
            Anagrafica completa non ancora compilata. Modifica l&apos;allieva per
            aggiungere codice fiscale, luogo di nascita e residenza.
          </p>
        )}

        {athlete.instructorNotes && (
          <div className="border-t pt-4">
            <h4 className="text-xs text-muted-foreground mb-1">
              Note istruttore
            </h4>
            <p className="text-sm whitespace-pre-wrap">
              {athlete.instructorNotes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
