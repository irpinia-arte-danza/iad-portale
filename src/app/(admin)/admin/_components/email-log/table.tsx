"use client"

import { useState, useTransition } from "react"
import {
  Clock,
  Eye,
  Info,
  Loader2,
  MailX,
  MoreHorizontal,
  RefreshCw,
  UserCog,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { EmailStatus } from "@prisma/client"

import { resendFromLog } from "./actions"
import { EmailLogPreviewDialog } from "./preview-dialog"
import type { EmailLogRow } from "./queries"
import { EmailLogTechnicalDialog } from "./technical-dialog"

const DATETIME_IT = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

const STATUS_LABEL: Record<EmailStatus, string> = {
  PENDING: "In attesa",
  SENT: "Inviata",
  DELIVERED: "Consegnata",
  OPENED: "Aperta",
  BOUNCED: "Bounce",
  COMPLAINED: "Spam",
  FAILED: "Errore",
}

const STATUS_CLASS: Record<EmailStatus, string> = {
  PENDING:
    "border-muted-foreground/30 bg-muted text-muted-foreground",
  SENT: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  DELIVERED:
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  OPENED:
    "border-emerald-600/60 bg-emerald-600/20 text-emerald-800 dark:text-emerald-300",
  BOUNCED:
    "border-destructive/40 bg-destructive/10 text-destructive dark:text-red-400",
  COMPLAINED:
    "border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-400",
  FAILED:
    "border-destructive/40 bg-destructive/10 text-destructive dark:text-red-400",
}

interface Props {
  title: string
  description: string
  logs: EmailLogRow[]
}

export function EmailLogTable({ title, description, logs }: Props) {
  const [previewLog, setPreviewLog] = useState<EmailLogRow | null>(null)
  const [technicalLog, setTechnicalLog] = useState<EmailLogRow | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [, startResend] = useTransition()

  function handleResend(log: EmailLogRow) {
    setResendingId(log.id)
    startResend(async () => {
      const res = await resendFromLog(log.id)
      setResendingId(null)
      if (res.ok) {
        toast.success("Email reinviata")
      } else {
        toast.error(res.error ?? "Reinvio fallito")
      }
    })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <MailX className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Nessuna email inviata.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Data</TableHead>
                    <TableHead>Oggetto</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Template
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Destinatario
                    </TableHead>
                    <TableHead className="w-[120px]">Stato</TableHead>
                    <TableHead className="w-[80px]">Trigger</TableHead>
                    <TableHead className="w-[60px] text-right">
                      <span className="sr-only">Azioni</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const isResending = resendingId === log.id
                    const canResend = log.status === EmailStatus.FAILED
                    const triggerIcon =
                      log.triggeredBy === "CRON" ? (
                        <Clock className="h-3.5 w-3.5" />
                      ) : (
                        <UserCog className="h-3.5 w-3.5" />
                      )
                    const triggerTooltip =
                      log.triggeredBy === "CRON"
                        ? "Invio automatico (cron)"
                        : `Invio manuale da ${
                            [
                              log.sentByUser.firstName,
                              log.sentByUser.lastName,
                            ]
                              .filter(Boolean)
                              .join(" ") || log.sentByUser.email
                          }`

                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs tabular-nums">
                          {DATETIME_IT.format(log.sentAt)}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate font-medium">
                          {log.subject}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                          {log.template?.name ??
                            (log.templateSlug ? (
                              <span className="italic">
                                {log.templateSlug} (eliminato)
                              </span>
                            ) : (
                              "—"
                            ))}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">
                                {log.recipientName ?? log.recipientEmail}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {log.recipientEmail}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={STATUS_CLASS[log.status]}
                          >
                            {STATUS_LABEL[log.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center gap-1 text-muted-foreground">
                                {triggerIcon}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>{triggerTooltip}</TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={isResending}
                                aria-label="Azioni"
                              >
                                {isResending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MoreHorizontal className="h-4 w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setPreviewLog(log)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Anteprima contenuto
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setTechnicalLog(log)}
                              >
                                <Info className="mr-2 h-4 w-4" />
                                Dettagli tecnici
                              </DropdownMenuItem>
                              {canResend ? (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleResend(log)}
                                  >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Reinvia
                                  </DropdownMenuItem>
                                </>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <EmailLogPreviewDialog
        log={previewLog}
        open={previewLog !== null}
        onOpenChange={(o) => {
          if (!o) setPreviewLog(null)
        }}
      />

      <EmailLogTechnicalDialog
        log={technicalLog}
        open={technicalLog !== null}
        onOpenChange={(o) => {
          if (!o) setTechnicalLog(null)
        }}
      />
    </>
  )
}
