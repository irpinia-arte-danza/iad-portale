import { cn } from "@/lib/utils"

interface ResourceContentProps {
  children: React.ReactNode
  className?: string
}

export function ResourceContent({ children, className }: ResourceContentProps) {
  return (
    <div className={cn("space-y-6 pt-6", className)}>
      {children}
    </div>
  )
}
