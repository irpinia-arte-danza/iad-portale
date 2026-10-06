"use client"

import Link from "next/link"
import { ArrowDown } from "lucide-react"

import { CardStatusBadge } from "@/components/affiliations/card-status-badge"
import {
  ResponsiveList,
  type ListColumn,
} from "@/components/lists/responsive-list"
import { CertStatusBadge } from "@/components/medical-certificates/cert-status-badge"
import { Badge } from "@/components/ui/badge"
import type { CardStatus } from "@/lib/affiliations/card-status"
import type { CertStatus } from "@/lib/medical-certificates/certificate-status"
import { statusTone, TONE_TEXT } from "@/lib/status/tone"
import { cn } from "@/lib/utils"
import { computeAge } from "@/lib/utils/date-helpers"
import { formatDateShort, formatEuro } from "@/lib/utils/format"
import { listName } from "@/lib/utils/person-name"

import { AthleteRowActions } from "./athlete-row-actions"

type AthleteRow = {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: Date
  gender: "F" | "M" | "OTHER"
  status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "WITHDRAWN"
  email: string | null
  phone: string | null
  fiscalCode: string | null
  placeOfBirth: string | null
  provinceOfBirth: string | null
  residenceStreet: string | null
  residenceNumber: string | null
  residenceCity: string | null
  residenceProvince: string | null
  residenceCap: string | null
  instructorNotes: string | null
  _count: { parentRelations: number }
  // Contributi scaduti e non pagati, stesso predicato dell'elenco Scadenze
  overdue: { count: number; amountCents: number }
  // Certificato corrente, stato calcolato lato server
  certificate: { expiryDate: Date | null; status: CertStatus }
  // Tessera dell'ente corrente, stesso trattamento
  card: { expiryDate: Date | null; status: CardStatus }
}

type AthletesSort = "name" | "certificate" | "card"

interface AthletesTableProps {
  athletes: AthleteRow[]
  sort: AthletesSort
  sortHrefs: Record<AthletesSort, string>
  // Con un filtro attivo "nessun risultato" vuol dire un'altra cosa, e
  // "aggiungi la prima allieva" sarebbe un consiglio sbagliato
  empty?: { title: string; hint: string }
}

const STATUS_LABELS: Record<AthleteRow["status"], string> = {
  TRIAL: "Prova",
  ACTIVE: "Attiva",
  SUSPENDED: "Sospesa",
  WITHDRAWN: "Ritirata",
}

const STATUS_VARIANTS: Record<
  AthleteRow["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  TRIAL: "secondary",
  ACTIVE: "default",
  SUSPENDED: "outline",
  WITHDRAWN: "destructive",
}

function SortLink({
  label,
  href,
  active,
}: {
  label: string
  href: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex items-center gap-1 hover:text-foreground hover:underline",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {label}
      {active ? <ArrowDown className="h-3 w-3" /> : null}
    </Link>
  )
}

function expiryLine(
  date: Date | null,
  expired: boolean,
  femminile = false,
): string | null {
  if (!date) return null
  const verbo = expired
    ? femminile
      ? "scaduta il"
      : "scaduto il"
    : "scade il"
  return `${verbo} ${formatDateShort(new Date(date))}`
}

export function AthletesTable({
  athletes,
  sort,
  sortHrefs,
  empty,
}: AthletesTableProps) {
  // ── Colonne ─────────────────────────────────────────────────────────────
  // Priorità alta: nome, certificato e tessera, cioè chi è e se può entrare
  // in sala. Età e genitori arrivano dove c'è spazio.
  const columns: ListColumn<AthleteRow>[] = [
    {
      key: "nome",
      header: (
        <SortLink label="Nome" href={sortHrefs.name} active={sort === "name"} />
      ),
      width: "md:flex-1",
      cell: (athlete) => (
        <Link
          href={`/admin/athletes/${athlete.id}`}
          className="truncate font-medium hover:underline"
        >
          {listName(athlete)}
        </Link>
      ),
    },
    {
      key: "eta",
      header: "Età",
      priority: "medium",
      width: "md:w-16",
      cell: (athlete) => {
        const age = computeAge(athlete.dateOfBirth)
        return <span className="text-sm">{age !== null ? age : "—"}</span>
      },
    },
    {
      key: "stato",
      header: "Stato",
      priority: "medium",
      width: "md:w-24",
      cell: (athlete) => (
        <Badge variant={STATUS_VARIANTS[athlete.status]}>
          {STATUS_LABELS[athlete.status]}
        </Badge>
      ),
    },
    {
      key: "certificato",
      header: (
        <SortLink
          label="Certificato"
          href={sortHrefs.certificate}
          active={sort === "certificate"}
        />
      ),
      width: "md:w-44",
      cell: (athlete) => (
        <div className="flex flex-col items-start gap-1">
          <CertStatusBadge status={athlete.certificate.status} />
          {athlete.certificate.expiryDate ? (
            <span className="text-xs text-muted-foreground">
              {expiryLine(
                athlete.certificate.expiryDate,
                athlete.certificate.status === "expired",
              )}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "tessera",
      header: (
        <SortLink
          label="Tessera"
          href={sortHrefs.card}
          active={sort === "card"}
        />
      ),
      width: "md:w-44",
      cell: (athlete) => (
        <div className="flex flex-col items-start gap-1">
          <CardStatusBadge status={athlete.card.status} />
          {athlete.card.expiryDate ? (
            <span className="text-xs text-muted-foreground">
              {expiryLine(
                athlete.card.expiryDate,
                athlete.card.status === "expired",
                true,
              )}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "genitori",
      header: "Genitori",
      priority: "low",
      width: "md:w-20",
      align: "center",
      cell: (athlete) => (
        <span className="text-sm">{athlete._count.parentRelations}</span>
      ),
    },
  ]

  return (
    <ResponsiveList
      label="Allieve"
      items={athletes}
      getId={(athlete) => athlete.id}
      columns={columns}
      empty={{
        title: empty?.title ?? "Nessuna allieva trovata",
        hint:
          empty?.hint ??
          "Prova a modificare la ricerca o aggiungi la prima allieva.",
      }}
      // Le due righe della card: può fare lezione (certificato e tessera) e
      // se è in pari con i contributi. Sono le due domande per cui si apre
      // l'elenco dal telefono; età, stato e genitori restano colonne.
      cardLines={(athlete) => [
        <span key="documenti" className="flex flex-wrap items-center gap-1.5">
          <CertStatusBadge status={athlete.certificate.status} />
          <CardStatusBadge status={athlete.card.status} />
        </span>,
        athlete.overdue.count > 0 ? (
          <span key="contributi" className={TONE_TEXT.fix}>
            {athlete.overdue.count === 1
              ? "1 contributo in ritardo"
              : `${athlete.overdue.count} contributi in ritardo`}{" "}
            · <span className="font-mono">{formatEuro(athlete.overdue.amountCents)}</span>
          </span>
        ) : (
          <span key="contributi">Contributi in regola</span>
        ),
      ]}
      rowClassName={(athlete) =>
        cn(
          "hover:bg-muted/50",
          // Riga rossa dove il certificato blocca la lezione
          statusTone({
            kind: "certificate",
            status: athlete.certificate.status,
          }) === "block" && "bg-status-block-bg",
        )
      }
      actions={(athlete) => (
        <AthleteRowActions
          layout="responsive"
          athlete={{
            id: athlete.id,
            firstName: athlete.firstName,
            lastName: athlete.lastName,
            dateOfBirth: athlete.dateOfBirth,
            gender: athlete.gender,
            email: athlete.email,
            phone: athlete.phone,
            linkedParents: athlete._count.parentRelations,
            fiscalCode: athlete.fiscalCode,
            placeOfBirth: athlete.placeOfBirth,
            provinceOfBirth: athlete.provinceOfBirth,
            residenceStreet: athlete.residenceStreet,
            residenceNumber: athlete.residenceNumber,
            residenceCity: athlete.residenceCity,
            residenceProvince: athlete.residenceProvince,
            residenceCap: athlete.residenceCap,
            instructorNotes: athlete.instructorNotes,
          }}
        />
      )}
    />
  )
}
