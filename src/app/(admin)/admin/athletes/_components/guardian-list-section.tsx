// Server component: la variante la decide il server, così il giorno di Roma
// è uno solo e non c'è niente da ricalcolare nel browser. I figli (dialog e
// azioni di riga) restano client.
import { KeyRound, Mail, Plus, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { guardianSection } from "@/lib/athletes/guardian-section"

import type { AthleteParentRelation } from "../queries"
import { GuardianPickerDialog } from "./guardian-picker-dialog"
import { GuardianRowActions } from "./guardian-row-actions"

type Relationship = AthleteParentRelation["relationship"]

interface GuardianListSectionProps {
  athleteId: string
  parentRelations: AthleteParentRelation[]
  // L'età decide cosa dice la sezione: per una maggiorenne del corso adulti
  // "collega un genitore" non è un passo mancante
  dateOfBirth: Date
  // Ha già un account proprio sul portale
  hasOwnAccess: boolean
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
  dateOfBirth,
  hasOwnAccess,
}: GuardianListSectionProps) {
  const section = guardianSection({
    dateOfBirth,
    linkedParents: parentRelations.length,
    hasOwnAccess,
  })

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
            existingGuardians={parentRelations.map((rel) => ({
              id: rel.id,
              firstName: rel.parent.firstName,
              lastName: rel.parent.lastName,
              isPrimaryContact: rel.isPrimaryContact,
              isPrimaryPayer: rel.isPrimaryPayer,
            }))}
            accessWarning={section.accessWarning}
            trigger={
              <Button size="sm" variant={section.addButton.variant}>
                <Plus className="h-4 w-4" />
                {section.addButton.label}
              </Button>
            }
          />
        </div>
      </CardHeader>
      <CardContent>
        {section.empty ? (
          section.empty.style === "call-to-action" ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <UserPlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <h3 className="text-sm font-medium">{section.empty.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {section.empty.hint}
              </p>
            </div>
          ) : (
            // Maggiorenne: niente manca, quindi niente invito in evidenza
            <p className="text-sm text-muted-foreground">
              {section.empty.text}
            </p>
          )
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
                    {rel.isPrimaryPayer && <span>💰 Paga i contributi</span>}
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
                <GuardianRowActions
                  athleteParent={rel}
                  otherRelations={parentRelations.filter(
                    (r) => r.id !== rel.id,
                  )}
                />
              </li>
            ))}
          </ul>
        )}
        {section.recipientNote ? (
          <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
            <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{section.recipientNote}</span>
          </p>
        ) : null}
        {section.ownAccessNote ? (
          <p className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
            <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{section.ownAccessNote}</span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
