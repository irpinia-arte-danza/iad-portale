"use client"

import { ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import type { AuditLogRow } from "../queries"

import { AdminInviteForm } from "./admin-invite-form"
import { AuditLogList } from "./audit-log-list"

interface AdminRow {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  isActive: boolean
  createdAt: Date
}

interface AdminTabProps {
  currentUserId: string
  admins: AdminRow[]
  auditRows: AuditLogRow[]
}

export function AdminTab({ currentUserId, admins, auditRows }: AdminTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Amministratori attivi</CardTitle>
          <CardDescription>
            Utenti con accesso completo al pannello. La revoca non è disponibile
            per sicurezza: per disabilitare un admin contatta il responsabile
            tecnico.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {admins.map((a) => {
              const fullName =
                [a.firstName, a.lastName].filter(Boolean).join(" ") || "—"
              const isMe = a.id === currentUserId
              return (
                <li
                  key={a.id}
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {fullName}
                        {isMe ? (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (tu)
                          </span>
                        ) : null}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {a.email}
                      </span>
                    </div>
                  </div>
                  {!a.isActive ? (
                    <Badge variant="destructive">disattivato</Badge>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invita un amministratore</CardTitle>
          <CardDescription>
            Spedisce un magic link via email. Al primo accesso l&apos;utente
            imposta la password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminInviteForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attività recente</CardTitle>
          <CardDescription>
            Ultime modifiche effettuate alle impostazioni. Il log è immutabile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuditLogList rows={auditRows} />
        </CardContent>
      </Card>
    </div>
  )
}
