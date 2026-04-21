"use client"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface TeacherAnagraficaDisplayProps {
  teacher: {
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    fiscalCode: string | null
    qualifications: string | null
    isActive: boolean
  }
}

export function TeacherAnagraficaDisplay({
  teacher,
}: TeacherAnagraficaDisplayProps) {
  const hasContatti = !!(teacher.email || teacher.phone)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Anagrafica</CardTitle>
            <CardDescription>Contatti, codice fiscale e qualifiche.</CardDescription>
          </div>
          {teacher.isActive ? (
            <Badge>Attiva</Badge>
          ) : (
            <Badge variant="outline">Archiviata</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasContatti ? (
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            {teacher.email && (
              <div>
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd className="break-all">{teacher.email}</dd>
              </div>
            )}
            {teacher.phone && (
              <div>
                <dt className="text-xs text-muted-foreground">Telefono</dt>
                <dd className="font-mono">{teacher.phone}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Nessun contatto registrato.
          </p>
        )}

        {teacher.fiscalCode && (
          <div className="border-t pt-4">
            <dt className="text-xs text-muted-foreground">Codice fiscale</dt>
            <dd className="font-mono text-sm">{teacher.fiscalCode}</dd>
          </div>
        )}

        {teacher.qualifications && (
          <div className="border-t pt-4">
            <h4 className="text-xs text-muted-foreground mb-1">Qualifiche</h4>
            <p className="text-sm whitespace-pre-wrap">
              {teacher.qualifications}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
