"use client"

import Link from "next/link"
import { AlertCircle, GraduationCap, UserCheck, Users } from "lucide-react"

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
    },
    {
      title: "Attive",
      value: stats.athletesActive,
      icon: UserCheck,
      href: "/admin/athletes",
      description: "Iscrizione confermata",
    },
    {
      title: "In prova",
      value: stats.athletesTrial,
      icon: AlertCircle,
      href: "/admin/athletes",
      description: "Lezioni di prova",
    },
    {
      title: "Genitori",
      value: stats.parentsTotal,
      icon: Users,
      href: "/admin/parents",
      description: "Tutori registrati",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Link
            key={card.title}
            href={card.href}
            className="transition-transform hover:scale-[1.02]"
          >
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{card.value}</div>
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
