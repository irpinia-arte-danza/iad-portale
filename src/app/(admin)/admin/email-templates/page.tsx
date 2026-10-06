import Link from "next/link"

import { EmailCategory } from "@prisma/client"
import { ArrowRight, Mail } from "lucide-react"

import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { templateUsage } from "@/lib/resend/template-usage"

import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"
import { listEmailTemplates } from "./actions"

const CATEGORY_LABEL: Record<EmailCategory, string> = {
  SOLLECITO: "Sollecito",
  PROMEMORIA: "Promemoria",
  BENVENUTO: "Benvenuto",
  CONFERMA: "Conferma",
  COMUNICAZIONE: "Comunicazione",
}

// Colori di categoria, non di stato: il rosso qui non c'è, perché un
// modello di sollecito non blocca niente — è solo un testo da mandare
const CATEGORY_CLASS: Record<EmailCategory, string> = {
  SOLLECITO: "",
  PROMEMORIA:
    "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  BENVENUTO:
    "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400",
  CONFERMA:
    "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  COMUNICAZIONE:
    "border-gray-500/40 bg-gray-500/10 text-gray-700 dark:text-gray-400",
}

export default async function EmailTemplatesPage() {
  const templates = await listEmailTemplates()

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Testi delle email" }]}
        title="Testi delle email"
        description="I testi usati quando premi Invia"
      />
      <ResourceContent>
        {templates.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="Nessun testo configurato"
            description="Qui compaiono i testi di solleciti, ricevute e inviti, da adattare alla scuola"
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((t) => (
              <Card key={t.slug} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base leading-tight">
                      {t.name}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={CATEGORY_CLASS[t.category]}
                    >
                      {CATEGORY_LABEL[t.category]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  {t.description ? (
                    <p className="text-sm text-muted-foreground">
                      {t.description}
                    </p>
                  ) : null}
                  <div className="text-sm">
                    <span className="text-muted-foreground">Oggetto: </span>
                    <span className="font-medium">{t.subject}</span>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                    {/* "Attivo" non diceva niente: quello che serve sapere è
                        quando parte questo testo. Disattivato resta, perché
                        è l'eccezione. */}
                    <p className="min-w-0 text-xs text-muted-foreground">
                      {!t.isActive ? (
                        "Disattivato: non viene inviato"
                      ) : templateUsage(t) ? (
                        <>
                          Usato in:{" "}
                          <span className="text-foreground">
                            {templateUsage(t)}
                          </span>
                        </>
                      ) : (
                        "Non usato da nessun invio"
                      )}
                    </p>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/email-templates/${t.slug}`}>
                        Modifica
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ResourceContent>
    </>
  )
}
