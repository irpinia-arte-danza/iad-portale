import {
  BookOpen,
  Calendar,
  CalendarClock,
  FileSpreadsheet,
  FileText,
  FileWarning,
  FolderArchive,
  GraduationCap,
  Home,
  IdCard,
  MailPlus,
  Receipt,
  Settings,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  UserCog,
  Users,
  Wallet,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

// ─────────────────────────────────────────────────────────────────────────
// Voci della sidebar admin, a gruppi.
//
// Erano venti in una lista piatta: per arrivare a Scadenze o Ricevute
// bisognava scorrerle tutte, e su iPad ogni scorrimento è un costo. I gruppi
// seguono il lavoro — chi sono, cosa fanno, cosa incassano, cosa va al
// commercialista — e in fondo, staccato, quello che si apre di rado.
//
// File senza "use client" né "use server": lo legge la sidebar (client) e lo
// legge il test che controlla che nessuna pagina resti fuori.
// ─────────────────────────────────────────────────────────────────────────

export type AdminNavItem = {
  href: string
  label: string
  icon: LucideIcon
  // Solo la dashboard: senza questo, "/admin/dashboard" resterebbe accesa
  // anche sulle altre pagine che iniziano per lo stesso prefisso
  exact?: boolean
}

export type AdminNavGroup = {
  // null = gruppo senza intestazione
  label: string | null
  items: AdminNavItem[]
  // Spinto in fondo, sopra il footer: ci si va di rado
  atBottom?: boolean
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: null,
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: Home, exact: true },
    ],
  },
  {
    label: "Persone",
    items: [
      { href: "/admin/athletes", label: "Allieve", icon: GraduationCap },
      { href: "/admin/parents", label: "Genitori", icon: Users },
      { href: "/admin/teachers", label: "Insegnanti", icon: UserCog },
      {
        href: "/admin/medical-certificates",
        label: "Certificati",
        icon: FileWarning,
      },
      // "Tessere" e non "Tessere ENDAS": l'ASD è affiliata anche a CSEN
      { href: "/admin/tessere", label: "Tessere", icon: IdCard },
    ],
  },
  {
    label: "Attività",
    items: [
      { href: "/admin/courses", label: "Corsi", icon: BookOpen },
      { href: "/admin/stages", label: "Stage", icon: Sparkles },
      { href: "/admin/showcase", label: "Saggio", icon: Star },
    ],
  },
  {
    label: "Incassi",
    items: [
      { href: "/admin/scadenze", label: "Scadenze", icon: CalendarClock },
      { href: "/admin/payments", label: "Pagamenti", icon: Receipt },
      { href: "/admin/receipts", label: "Ricevute", icon: FileText },
    ],
  },
  {
    label: "Amministrazione",
    items: [
      { href: "/admin/expenses", label: "Spese", icon: Wallet },
      {
        href: "/admin/reports/corrispettivi",
        label: "Corrispettivi",
        icon: FileSpreadsheet,
      },
      { href: "/admin/reports/bilancio", label: "Bilancio", icon: TrendingUp },
      {
        href: "/admin/reports/annuale",
        label: "Export annuale",
        icon: FolderArchive,
      },
    ],
  },
  {
    label: null,
    atBottom: true,
    items: [
      { href: "/admin/email-templates", label: "Modelli email", icon: MailPlus },
      {
        href: "/admin/academic-years",
        label: "Anni accademici",
        icon: Calendar,
      },
      { href: "/admin/settings", label: "Impostazioni", icon: Settings },
      { href: "/admin/cestino", label: "Cestino", icon: Trash2 },
    ],
  },
]

export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV.flatMap(
  (group) => group.items,
)

// La voce resta accesa anche nelle sottopagine: /admin/athletes/{id} accende
// Allieve. La dashboard è l'eccezione, con `exact`.
export function isNavItemActive(item: AdminNavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}
