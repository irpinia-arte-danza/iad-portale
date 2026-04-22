"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import type { EmailTemplate } from "@prisma/client"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

import { useBeforeUnloadGuard } from "@/lib/hooks/use-dirty-form"
import {
  MOCK_TEMPLATE_VARS,
  TEMPLATE_VAR_GROUPS,
} from "@/lib/resend/mock-vars"
import { substituteVariables } from "@/lib/resend/template-vars"

import { StickySaveBar } from "../../../settings/_components/sticky-save-bar"
import { updateEmailTemplate } from "../../actions"

const CATEGORY_LABEL: Record<string, string> = {
  SOLLECITO: "Sollecito",
  PROMEMORIA: "Promemoria",
  BENVENUTO: "Benvenuto",
  CONFERMA: "Conferma",
  COMUNICAZIONE: "Comunicazione",
}

const CATEGORY_CLASS: Record<string, string> = {
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

type ActiveField = "subject" | "html" | "text"

interface TemplateEditorProps {
  template: EmailTemplate
}

export function TemplateEditor({ template }: TemplateEditorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const initial = useMemo(
    () => ({
      subject: template.subject,
      bodyHtml: template.bodyHtml,
      bodyText: template.bodyText ?? "",
      isActive: template.isActive,
    }),
    [template],
  )

  const [subject, setSubject] = useState(initial.subject)
  const [bodyHtml, setBodyHtml] = useState(initial.bodyHtml)
  const [bodyText, setBodyText] = useState(initial.bodyText)
  const [isActive, setIsActive] = useState(initial.isActive)
  const [activeField, setActiveField] = useState<ActiveField>("html")

  const subjectRef = useRef<HTMLInputElement>(null)
  const htmlRef = useRef<HTMLTextAreaElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const isDirty =
    subject !== initial.subject ||
    bodyHtml !== initial.bodyHtml ||
    bodyText !== initial.bodyText ||
    isActive !== initial.isActive

  useBeforeUnloadGuard(isDirty)

  const preview = useMemo(
    () => ({
      subject: substituteVariables(subject, MOCK_TEMPLATE_VARS),
      bodyHtml: substituteVariables(bodyHtml, MOCK_TEMPLATE_VARS),
      bodyText: bodyText
        ? substituteVariables(bodyText, MOCK_TEMPLATE_VARS)
        : "",
    }),
    [subject, bodyHtml, bodyText],
  )

  const insertVariable = useCallback(
    (varName: string) => {
      const token = `{${varName}}`

      if (activeField === "subject") {
        const el = subjectRef.current
        if (!el) return
        const start = el.selectionStart ?? el.value.length
        const end = el.selectionEnd ?? el.value.length
        const next = el.value.slice(0, start) + token + el.value.slice(end)
        setSubject(next)
        requestAnimationFrame(() => {
          el.focus()
          const pos = start + token.length
          el.setSelectionRange(pos, pos)
        })
        return
      }

      const el = activeField === "html" ? htmlRef.current : textRef.current
      if (!el) return
      const start = el.selectionStart ?? el.value.length
      const end = el.selectionEnd ?? el.value.length
      const next = el.value.slice(0, start) + token + el.value.slice(end)
      if (activeField === "html") {
        setBodyHtml(next)
      } else {
        setBodyText(next)
      }
      requestAnimationFrame(() => {
        el.focus()
        const pos = start + token.length
        el.setSelectionRange(pos, pos)
      })
    },
    [activeField],
  )

  function handleDiscard() {
    setSubject(initial.subject)
    setBodyHtml(initial.bodyHtml)
    setBodyText(initial.bodyText)
    setIsActive(initial.isActive)
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateEmailTemplate(template.slug, {
        subject,
        bodyHtml,
        bodyText: bodyText.length > 0 ? bodyText : null,
        isActive,
      })
      if (result.ok) {
        toast.success("Template aggiornato")
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <header className="flex flex-col gap-3 border-b pb-6">
        <Button asChild variant="ghost" size="sm" className="w-fit -ml-2">
          <Link href="/admin/email-templates">
            <ArrowLeft className="h-4 w-4" />
            Tutti i template
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {template.name}
          </h1>
          <Badge variant="outline" className={CATEGORY_CLASS[template.category]}>
            {CATEGORY_LABEL[template.category]}
          </Badge>
          <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
            {template.slug}
          </code>
        </div>
        {template.description ? (
          <p className="text-sm text-muted-foreground">{template.description}</p>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="flex flex-col">
              <Label htmlFor="is-active" className="text-sm font-medium">
                Template attivo
              </Label>
              <span className="text-xs text-muted-foreground">
                Se disattivato non compare nel dialog invio sollecito.
              </span>
            </div>
            <Switch
              id="is-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Oggetto</Label>
            <Input
              id="subject"
              ref={subjectRef}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onFocus={() => setActiveField("subject")}
              maxLength={200}
              placeholder="Oggetto email"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Puoi inserire variabili come {"{allieva_nome}"}.</span>
              <span>{subject.length}/200</span>
            </div>
          </div>

          <Tabs defaultValue="html" className="w-full">
            <TabsList>
              <TabsTrigger value="html">HTML</TabsTrigger>
              <TabsTrigger value="text">Testo (opzionale)</TabsTrigger>
            </TabsList>
            <TabsContent value="html" className="mt-3">
              <Textarea
                ref={htmlRef}
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                onFocus={() => setActiveField("html")}
                placeholder="<p>Gentile {genitore_nome}, ...</p>"
                className="min-h-[360px] font-mono text-xs"
              />
            </TabsContent>
            <TabsContent value="text" className="mt-3">
              <Textarea
                ref={textRef}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                onFocus={() => setActiveField("text")}
                placeholder="Opzionale. Fallback plain-text per client senza HTML."
                className="min-h-[360px] font-mono text-xs"
              />
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label>Anteprima con dati di esempio</Label>
            <div className="space-y-3 rounded-md border p-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Oggetto: </span>
                <span className="font-medium">{preview.subject}</span>
              </div>
              <div
                className="prose prose-sm dark:prose-invert max-h-96 max-w-none overflow-y-auto rounded border bg-muted/30 p-3"
                dangerouslySetInnerHTML={{ __html: preview.bodyHtml }}
              />
              {preview.bodyText ? (
                <div>
                  <div className="mb-1 text-xs font-medium text-muted-foreground">
                    Fallback testo
                  </div>
                  <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded border bg-muted/30 p-3 font-mono text-xs">
                    {preview.bodyText}
                  </pre>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-md border p-3">
            <div className="mb-1 text-sm font-medium">Variabili disponibili</div>
            <p className="text-xs text-muted-foreground">
              Click per inserirle nel campo attivo ({activeFieldLabel(activeField)}).
            </p>
          </div>
          {TEMPLATE_VAR_GROUPS.map((group) => (
            <div key={group.label} className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </div>
              <div className="flex flex-col gap-1.5">
                {group.vars.map((v) => (
                  <Button
                    key={v.key}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto justify-start px-2 py-1.5 text-left"
                    onClick={() => insertVariable(v.key)}
                  >
                    <div className="flex flex-col items-start gap-0.5">
                      <code className="font-mono text-xs">{`{${v.key}}`}</code>
                      <span className="text-[10px] text-muted-foreground">
                        {v.description}
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </aside>
      </div>

      <StickySaveBar
        visible={isDirty}
        submitting={isPending}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </div>
  )
}

function activeFieldLabel(field: ActiveField): string {
  if (field === "subject") return "Oggetto"
  if (field === "html") return "HTML"
  return "Testo"
}
