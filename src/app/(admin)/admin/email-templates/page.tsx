import Link from "next/link"

import { EmailCategory } from "@prisma/client"
import { ArrowRight, Circle, Mail } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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

const CATEGORY_CLASS: Record<EmailCategory, string> = {
  SOLLECITO:
    "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400",
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
        breadcrumbs={[{ label: "Email templates" }]}
        title="Email templates"
        description="Gestisci oggetto e corpo delle email automatiche inviate alle famiglie."
      />
      <ResourceContent>
        {templates.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <Mail className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-3 text-base font-medium">Nessun template</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              I template vengono creati dal seed iniziale del database.
            </p>
          </div>
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
                    <div className="flex items-center gap-1.5 text-xs">
                      <Circle
                        className={
                          t.isActive
                            ? "h-2 w-2 fill-green-500 text-green-500"
                            : "h-2 w-2 fill-muted-foreground/40 text-muted-foreground/40"
                        }
                      />
                      <span
                        className={
                          t.isActive
                            ? "text-green-700 dark:text-green-400"
                            : "text-muted-foreground"
                        }
                      >
                        {t.isActive ? "Attivo" : "Disattivato"}
                      </span>
                    </div>
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
