"use client"

import Link from "next/link"
import { ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { ResetSecondFactorButton } from "./reset-second-factor-button"

interface AdminRow {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  isActive: boolean
  createdAt: Date
  hasSecondFactor: boolean
  recoveryCodesLeft: number
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
            Utenti con accesso completo al pannello. Ogni amministratore entra
            con password e secondo fattore (i sei numeri dell&apos;app). Se
            l&apos;altro amministratore ha perso il dispositivo, da qui gli
            azzeri il secondo fattore: al prossimo accesso lo ricollega. La
            revoca dell&apos;accesso non è disponibile per sicurezza: per
            disabilitare un admin contatta il responsabile tecnico.
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
                      <span className="text-xs text-muted-foreground">
                        {a.hasSecondFactor
                          ? `Secondo fattore attivo · ${a.recoveryCodesLeft} codici di recupero`
                          : "Secondo fattore non ancora collegato"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {!a.isActive ? (
                      <Badge variant="destructive">disattivato</Badge>
                    ) : null}
                    {isMe && a.hasSecondFactor ? (
                      <Button asChild variant="outline" size="sm" className="min-h-11 sm:min-h-9">
                        <Link href="/imposta-2fa">Collega di nuovo l&apos;app</Link>
                      </Button>
                    ) : null}
                    {!isMe && (a.hasSecondFactor || a.recoveryCodesLeft > 0) ? (
                      <ResetSecondFactorButton userId={a.id} name={fullName} />
                    ) : null}
                  </div>
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
