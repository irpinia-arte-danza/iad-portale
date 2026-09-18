"use client"

import { Loader2, RefreshCw, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type {
  AccessProfileKind,
  AccessStatus,
} from "@/lib/auth/access-status-types"

import { useSendAccessInvite } from "./use-send-access-invite"

type Props = {
  kind: AccessProfileKind
  profileId: string
  status: AccessStatus
  size?: "sm" | "default"
  className?: string
}

export function SendAccessButton({
  kind,
  profileId,
  status,
  size = "sm",
  className,
}: Props) {
  const { send, pendingId } = useSendAccessInvite(kind)

  if (status.kind === "ACTIVE") return null

  if (status.kind === "NO_EMAIL") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex">
            <Button
              type="button"
              variant="outline"
              size={size}
              className={className}
              disabled
            >
              <Send className="h-4 w-4" />
              Invia accesso
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {kind === "PARENT"
            ? "Manca l'email: modifica il genitore e aggiungila"
            : kind === "TEACHER"
              ? "Manca l'email: modifica l'insegnante e aggiungila"
              : "Manca l'email: modifica l'allieva e aggiungila"}
        </TooltipContent>
      </Tooltip>
    )
  }

  const busy = pendingId === profileId
  const isReinvite = status.kind === "INVITED"

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={className}
      onClick={() => send(profileId)}
      disabled={busy}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isReinvite ? (
        <RefreshCw className="h-4 w-4" />
      ) : (
        <Send className="h-4 w-4" />
      )}
      {busy ? "Invio..." : isReinvite ? "Reinvia accesso" : "Invia accesso"}
    </Button>
  )
}
