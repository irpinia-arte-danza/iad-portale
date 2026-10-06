"use client"

import Link from "next/link"
import { UserPlus } from "lucide-react"

import { CardStatusBadge } from "@/components/affiliations/card-status-badge"
import {
  ResponsiveList,
  type ListColumn,
} from "@/components/lists/responsive-list"
import { CertStatusBadge } from "@/components/medical-certificates/cert-status-badge"
import { Badge } from "@/components/ui/badge"
import type { AthleteListRow } from "../queries"
import { statusTone, TONE_TEXT } from "@/lib/status/tone"
import { cn } from "@/lib/utils"
import { computeAge } from "@/lib/utils/date-helpers"
import { formatDateShort, formatEuro } from "@/lib/utils/format"
import { listName } from "@/lib/utils/person-name"

import { AthleteRowActions } from "./athlete-row-actions"

interface AthletesTableProps {
  athletes: AthleteListRow[]
  // Con un filtro attivo "nessun risultato" vuol dire un'altra cosa, e
  // "aggiungi la prima allieva" sarebbe un consiglio sbagliato
  empty?: { title: string; hint: string }
}

// "scaduto il 12/09/2026" · "scade il 30/06/2027". Una riga, non due.
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

function CertificateCell({ athlete }: { athlete: AthleteListRow }) {
  const { certificate } = athlete
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <CertStatusBadge status={certificate.status} />
      {certificate.expiryDate ? (
        <span className="hidden truncate font-mono text-xs text-muted-foreground lg:inline">
          {expiryLine(
            certificate.expiryDate,
            certificate.status === "expired",
          )}
        </span>
      ) : null}
    </span>
  )
}

// La tessera valida non si mostra: una colonna con "Valida" su ogni riga
// occupa spazio e non dice niente. Si vede solo quando manca o sta per
// scadere, cioè quando c'è da fare qualcosa.
function CardCell({ athlete }: { athlete: AthleteListRow }) {
  if (athlete.card.status === "valid") return null
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <CardStatusBadge status={athlete.card.status} />
      {athlete.card.expiryDate ? (
        <span className="hidden truncate font-mono text-xs text-muted-foreground lg:inline">
          {expiryLine(
            athlete.card.expiryDate,
            athlete.card.status === "expired",
            true,
          )}
        </span>
      ) : null}
    </span>
  )
}

function PayerCell({ athlete }: { athlete: AthleteListRow }) {
  const { payer } = athlete

  if (payer.kind === "PARENT") {
    return (
      <Link
        href={`/admin/parents/${payer.parentId}`}
        className="truncate text-sm hover:underline"
      >
        {payer.name}
      </Link>
    )
  }

  if (payer.kind === "ATHLETE") {
    // Maggiorenne senza genitori collegati: è normale, non è un buco (#35)
    return <span className="truncate text-sm text-muted-foreground">Paga lei</span>
  }

  // Minorenne senza nessuno collegato: non si emettono ricevute né solleciti
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className={cn("truncate text-sm", TONE_TEXT.block)}>
        Nessun genitore
      </span>
      <Link
        href={`/admin/athletes/${athlete.id}?tab=anagrafica`}
        className="inline-flex shrink-0 items-center gap-1 text-xs underline underline-offset-2"
      >
        <UserPlus className="h-3 w-3" />
        Collega
      </Link>
    </span>
  )
}

// "In ritardo 80,00 €", vuota se è in regola: una colonna che parla solo
// quando c'è un problema si legge scorrendo
function OverdueCell({ athlete }: { athlete: AthleteListRow }) {
  if (athlete.overdue.count === 0) return null
  return (
    <span className={cn("truncate text-sm", TONE_TEXT.fix)}>
      In ritardo{" "}
      <span className="font-mono">{formatEuro(athlete.overdue.amountCents)}</span>
    </span>
  )
}

export function AthletesTable({ athletes, empty }: AthletesTableProps) {
  // ── Colonne ─────────────────────────────────────────────────────────────
  // Alta (da 768): nome, certificato, chi paga, contributi — chi è, se può
  // fare lezione, chi si chiama se deve pagare. Età e tessera arrivano da
  // 1024, dove c'è spazio.
  const columns: ListColumn<AthleteListRow>[] = [
    {
      key: "nome",
      header: "Nome",
      width: "md:flex-1",
      // flex-wrap solo sotto 768, dove il corso va a capo sotto il nome: da
      // 768 la riga resta una riga di testo e i nomi lunghi si troncano
      // invece di mandare a capo il corso
      cell: (athlete) => (
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 md:flex-nowrap">
          <Link
            href={`/admin/athletes/${athlete.id}`}
            className="truncate font-medium hover:underline"
          >
            {listName(athlete)}
          </Link>
          {/* Il corso dell'anno: sotto il nome sul telefono, accanto da 768.
              Sotto anche da 768 farebbe ogni riga alta due righe di testo, e
              a 1440 si tornerebbe a vedere dieci allieve. */}
          {athlete.currentCourses.length > 0 ? (
            <span className="block w-full truncate text-xs text-muted-foreground md:inline md:w-auto">
              {athlete.currentCourses.map((c) => c.name).join(" · ")}
            </span>
          ) : null}
          {athlete.status === "WITHDRAWN" ? (
            <Badge variant="outline" className="shrink-0">
              Ritirata
            </Badge>
          ) : null}
        </span>
      ),
    },
    {
      key: "eta",
      header: "Età",
      priority: "medium",
      width: "md:w-14",
      cell: (athlete) => {
        const age = computeAge(athlete.dateOfBirth)
        return <span className="text-sm">{age !== null ? age : "—"}</span>
      },
    },
    {
      key: "certificato",
      header: "Certificato",
      // A 768 ci sta il badge, da 1024 anche la data
      width: "md:w-32 lg:w-48",
      cell: (athlete) => <CertificateCell athlete={athlete} />,
    },
    {
      key: "tessera",
      header: "Tessera",
      priority: "medium",
      width: "md:w-44",
      cell: (athlete) => <CardCell athlete={athlete} />,
    },
    {
      key: "pagante",
      header: "Chi paga",
      width: "md:w-40",
      cell: (athlete) => <PayerCell athlete={athlete} />,
    },
    {
      key: "contributi",
      header: "Contributi",
      width: "md:w-32 lg:w-40",
      cell: (athlete) => <OverdueCell athlete={athlete} />,
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
      // Le due righe della card sotto 768: documenti e contributi, le stesse
      // informazioni delle colonne che lì non ci stanno
      cardLines={(athlete) => [
        <span key="documenti" className="flex flex-wrap items-center gap-1.5">
          <CertStatusBadge status={athlete.certificate.status} />
          <CardStatusBadge status={athlete.card.status} />
        </span>,
        <span key="contributi" className="flex flex-wrap items-center gap-1.5">
          {athlete.overdue.count > 0 ? (
            <OverdueCell athlete={athlete} />
          ) : (
            <span>Contributi in regola</span>
          )}
          <span aria-hidden>·</span>
          <PayerCell athlete={athlete} />
        </span>,
      ]}
      // Una riga di testo per riga: a 1440 ne stanno quindici invece di dieci
      rowClassName={(athlete) =>
        cn(
          "py-2 hover:bg-muted/50",
          athlete.status === "WITHDRAWN" && "opacity-70",
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
            linkedParents: athlete.linkedParents,
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
