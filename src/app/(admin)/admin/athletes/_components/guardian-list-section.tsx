"use client"

import { UserPlus } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { GuardianPickerDialog } from "./guardian-picker-dialog"
import { GuardianRowActions } from "./guardian-row-actions"

type Relationship = "MOTHER" | "FATHER" | "GRANDPARENT" | "TUTOR" | "OTHER"

type ParentRelation = {
  id: string
  relationship: Relationship
  isPrimaryContact: boolean
  isPrimaryPayer: boolean
  isPickupAuthorized: boolean
  hasParentalAuthority: boolean
  parent: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
  }
}

interface GuardianListSectionProps {
  athleteId: string
  parentRelations: ParentRelation[]
}

const RELATIONSHIP_LABELS: Record<Relationship, string> = {
  MOTHER: "Madre",
  FATHER: "Padre",
  GRANDPARENT: "Nonno/a",
  TUTOR: "Tutore",
  OTHER: "Altro",
}

export function GuardianListSection({
  athleteId,
  parentRelations,
}: GuardianListSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Genitori e tutori</CardTitle>
            <CardDescription>
              Persone autorizzate per contatti, pagamenti e prelievo
              dell&apos;allieva.
            </CardDescription>
          </div>
          <GuardianPickerDialog
            athleteId={athleteId}
            existingGuardiansCount={parentRelations.length}
          />
        </div>
      </CardHeader>
      <CardContent>
        {parentRelations.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <UserPlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <h3 className="text-sm font-medium">Nessun genitore collegato</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Collega almeno un genitore o tutore per gestire contatti e
              pagamenti.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {parentRelations.map((rel) => (
              <li
                key={rel.id}
                className="flex items-start justify-between gap-4 rounded-md border p-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">
                      {rel.parent.lastName} {rel.parent.firstName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {RELATIONSHIP_LABELS[rel.relationship]}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {rel.isPrimaryContact && <span>⭐ Contatto principale</span>}
                    {rel.isPrimaryPayer && <span>💰 Paga le quote</span>}
                    {rel.isPickupAuthorized && <span>🚪 Può prelevare</span>}
                  </div>
                  {(rel.parent.email || rel.parent.phone) && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {rel.parent.email && <span>{rel.parent.email}</span>}
                      {rel.parent.email && rel.parent.phone && <span> · </span>}
                      {rel.parent.phone && <span>{rel.parent.phone}</span>}
                    </div>
                  )}
                </div>
                <GuardianRowActions athleteParent={rel} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
