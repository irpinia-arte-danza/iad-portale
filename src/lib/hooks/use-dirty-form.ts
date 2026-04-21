"use client"

import { useEffect } from "react"

const WARNING = "Hai modifiche non salvate. Vuoi davvero uscire?"

export function useBeforeUnloadGuard(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return

    function handler(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = WARNING
      return WARNING
    }

    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [enabled])
}
