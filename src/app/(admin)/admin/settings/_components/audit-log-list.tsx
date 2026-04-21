import { Badge } from "@/components/ui/badge"
import { formatDateShort } from "@/lib/utils/format"

import type { AuditLogRow } from "../queries"

const ACTION_LABELS: Record<string, string> = {
  UPDATE_BRAND: "Brand aggiornato",
  UPDATE_ASSOCIATION: "Dati associazione aggiornati",
  UPDATE_RICEVUTE: "Numerazione ricevute aggiornata",
  UPDATE_PROFILE: "Profilo aggiornato",
  CHANGE_PASSWORD: "Password cambiata",
  INVITE_ADMIN: "Invito amministratore inviato",
  LOGO_UPLOAD: "Logo caricato",
  LOGO_DELETE: "Logo rimosso",
}

const ACTION_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  UPDATE_BRAND: "secondary",
  UPDATE_ASSOCIATION: "secondary",
  UPDATE_RICEVUTE: "secondary",
  UPDATE_PROFILE: "secondary",
  CHANGE_PASSWORD: "default",
  INVITE_ADMIN: "default",
  LOGO_UPLOAD: "outline",
  LOGO_DELETE: "destructive",
}

function formatWhen(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 1) return "ora"
  if (diffMin < 60) return `${diffMin} min fa`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr} ore fa`
  return `${formatDateShort(date)} · ${date.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  })}`
}

interface AuditLogListProps {
  rows: AuditLogRow[]
}

export function AuditLogList({ rows }: AuditLogListProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nessuna attività registrata.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li
          key={r.id}
          className="flex flex-col gap-1 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <Badge variant={ACTION_VARIANT[r.action] ?? "outline"}>
                {ACTION_LABELS[r.action] ?? r.action}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {r.userName ?? r.userEmail ?? "—"}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatWhen(r.createdAt)}
          </span>
        </li>
      ))}
    </ul>
  )
}
