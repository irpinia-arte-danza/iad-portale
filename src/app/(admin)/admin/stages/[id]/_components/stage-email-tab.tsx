"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Mail } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { sendStageInvites } from "../../actions"

const DATETIME_IT = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

type EmailLogRow = {
  id: string
  recipientEmail: string
  recipientName: string | null
  subject: string
  status: string
  sentAt: Date
}

type Props = {
  stageId: string
  stageTitle: string
  logs: EmailLogRow[]
}

export function StageEmailTab({ stageId, stageTitle, logs }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [resultMsg, setResultMsg] = useState<string | null>(null)

  function onSend() {
    if (
      !confirm(
        `Inviare l'invito a tutte le allieve attive con genitore email-consenzante per «${stageTitle}»?`,
      )
    )
      return

    startTransition(async () => {
      const res = await sendStageInvites(stageId)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      const d = res.data!
      const msg = `Inviate: ${d.sent} · Già inviate: ${d.alreadySent} · Senza email: ${d.skippedNoEmail} · Senza consenso: ${d.skippedNoCommsConsent} · Fallite: ${d.failed}`
      setResultMsg(msg)
      if (d.transportError) toast.error(d.transportError)
      else if (d.sent > 0) toast.success(`${d.sent} email inviate`)
      else toast.message("Nessuna nuova email da inviare")
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Invito allieve</CardTitle>
          <p className="text-sm text-muted-foreground">
            Manda un&apos;email a tutte le famiglie attive con consenso
            comunicazioni. Idempotente: ciascuna allieva riceve l&apos;invito
            una sola volta per stage.
          </p>
        </div>
        <Button onClick={onSend} disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Invio…
            </>
          ) : (
            <>
              <Mail className="h-4 w-4" />
              Invita allieve
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {resultMsg && (
          <p className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            {resultMsg}
          </p>
        )}

        {logs.length === 0 ? (
          <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
            Nessun invito inviato per questo stage.
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Destinatario</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Oggetto</TableHead>
                  <TableHead>Stato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-xs">
                      {DATETIME_IT.format(l.sentAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {l.recipientName ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {l.recipientEmail}
                    </TableCell>
                    <TableCell className="text-sm">{l.subject}</TableCell>
                    <TableCell>
                      <StatusBadge status={l.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === "SENT" || status === "DELIVERED" || status === "OPENED") {
    return <Badge>{status}</Badge>
  }
  if (status === "BOUNCED" || status === "FAILED" || status === "COMPLAINED") {
    return <Badge variant="destructive">{status}</Badge>
  }
  return <Badge variant="secondary">{status}</Badge>
}
