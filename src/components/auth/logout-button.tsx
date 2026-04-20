"use client"

import { useTransition } from "react"

import { logout } from "@/app/(public)/login/actions"

export function LogoutButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={isPending}
      className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
      onClick={() => startTransition(() => logout())}
    >
      {isPending ? "Uscita..." : "Esci"}
    </button>
  )
}
