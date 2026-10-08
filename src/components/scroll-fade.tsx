"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────
// Una riga che scorre in orizzontale dentro il suo contenitore, non la
// pagina: le schede della scheda allieva sul telefono, quelle delle
// Impostazioni su iPad. Quando a destra (o a sinistra) c'è altro, il bordo
// sfuma: senza quell'indizio la scheda «Admin» fuori schermo non esisteva.
// La dissolvenza è una maschera sul contenitore, quindi segue il tema senza
// conoscere il colore di sfondo.
// ─────────────────────────────────────────────────────────────────────────

const FADE = 28

export function scrollFadeMask(more: { left: boolean; right: boolean }): string | undefined {
  if (!more.left && !more.right) return undefined
  const start = more.left ? `transparent 0, #000 ${FADE}px` : "#000 0"
  const end = more.right ? `#000 calc(100% - ${FADE}px), transparent 100%` : "#000 100%"
  return `linear-gradient(to right, ${start}, ${end})`
}

export function ScrollFade({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [more, setMore] = React.useState({ left: false, right: false })

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const left = el.scrollLeft > 1
      const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
      setMore((prev) => (prev.left === left && prev.right === right ? prev : { left, right }))
    }
    // La voce attiva (scheda o filtro) deve vedersi: se è oltre il bordo, la
    // riga parte già scorsa fin lì
    const active = el.querySelector<HTMLElement>(
      '[aria-pressed="true"], [data-state="active"], [aria-current="page"]',
    )
    if (active) {
      const overflowRight = active.offsetLeft + active.offsetWidth - (el.scrollLeft + el.clientWidth)
      if (overflowRight > 0) el.scrollLeft += overflowRight + FADE
      else if (active.offsetLeft < el.scrollLeft) el.scrollLeft = Math.max(0, active.offsetLeft - FADE)
    }
    update()
    el.addEventListener("scroll", update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    return () => {
      el.removeEventListener("scroll", update)
      observer.disconnect()
    }
  }, [])

  const mask = scrollFadeMask(more)
  return (
    <div
      ref={ref}
      data-slot="scroll-fade"
      data-more-right={more.right || undefined}
      className={cn("min-w-0 max-w-full overflow-x-auto overscroll-x-contain [scrollbar-width:none]", className)}
      style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
      {...props}
    >
      {children}
    </div>
  )
}
