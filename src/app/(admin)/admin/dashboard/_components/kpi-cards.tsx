"use client"

import Link from "next/link"
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  GraduationCap,
  UserCheck,
  Users,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface KpiCardsProps {
  stats: {
    athletesTotal: number
    athletesActive: number
    athletesTrial: number
    athletesSuspended: number
    parentsTotal: number
    schedulesOverdue: number
    schedulesDueThisMonth: number
    schedulesPaidThisMonth: number
  }
}

export function KpiCards({ stats }: KpiCardsProps) {
  const cards = [
    {
      title: "Allieve totali",
      value: stats.athletesTotal,
      icon: GraduationCap,
      href: "/admin/athletes",
      description: "Iscritte (escluse eliminate)",
      emphasis: false,
    },
    {
      title: "Attive",
      value: stats.athletesActive,
      icon: UserCheck,
      href: "/admin/athletes",
      description: "Iscrizione confermata",
      emphasis: false,
    },
    {
      title: "In prova",
      value: stats.athletesTrial,
      icon: AlertCircle,
      href: "/admin/athletes",
      description: "Lezioni di prova",
      emphasis: false,
    },
    {
      title: "Genitori",
      value: stats.parentsTotal,
      icon: Users,
      href: "/admin/parents",
      description: "Tutori registrati",
      emphasis: false,
    },
    {
      title: "Scadenze in ritardo",
      value: stats.schedulesOverdue,
      icon: AlertTriangle,
      href: "/admin/payments",
      description: "Quote non saldate oltre scadenza",
      emphasis: stats.schedulesOverdue > 0,
    },
    {
      title: "Scadenze questo mese",
      value: stats.schedulesDueThisMonth,
      icon: Calendar,
      href: "/admin/payments",
      description: "Quote in scadenza nel mese corrente",
      emphasis: false,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Link
            key={card.title}
            href={card.href}
            className="transition-transform hover:scale-[1.02]"
          >
            <Card
              className={
                card.emphasis
                  ? "h-full border-destructive/50 bg-destructive/5"
                  : "h-full"
              }
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <Icon
                  className={
                    card.emphasis
                      ? "h-4 w-4 text-destructive"
                      : "h-4 w-4 text-muted-foreground"
                  }
                />
              </CardHeader>
              <CardContent>
                <div
                  className={
                    card.emphasis
                      ? "text-3xl font-bold text-destructive"
                      : "text-3xl font-bold"
                  }
                >
                  {card.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
