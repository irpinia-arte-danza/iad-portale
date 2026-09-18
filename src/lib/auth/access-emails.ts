import "server-only"

import { EmailStatus, EmailTrigger, Prisma, UserRole } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/resend/send-email"
import { substituteVariables } from "@/lib/resend/template-vars"
import { createAdminClient } from "@/lib/supabase/admin-client"

import { athleteAccessEligibility } from "./athlete-access"

import { resolveAccountState, type AccountState } from "./account-state"
import {
  ACCESS_INVITE_MILESTONE,
  ACCESS_MILESTONES,
  ACCESS_REINVITE_MILESTONE,
  PASSWORD_RESET_MILESTONE,
  normalizeEmail,
  type AccessInviteErrorCode,
  type AccessInviteResult,
  type AccessProfileKind,
} from "./access-status-types"
import {
  findAuthUserByEmail,
  getAuthUsersByIds,
  type AuthUserInfo,
} from "./auth-users"

// ─────────────────────────────────────────────────────────────────────────
// Email con link personale (invito accesso + recupero password).
//
// Il link NON passa dall'SMTP di Supabase: generiamo il token con
// auth.admin.generateLink (nessuna email, nessun rate limit Supabase) e
// inviamo con Resend. Vantaggi: template modificabile in
// /admin/email-templates, EmailLog con milestoneKey e delivery tracking,
// nessuna dipendenza dai template della dashboard Supabase. La durata del
// link resta quella di "Email OTP Expiration" in Supabase.
// ─────────────────────────────────────────────────────────────────────────

export const ACCESS_TEMPLATE_SLUG = "accesso-portale"
export const PASSWORD_RESET_TEMPLATE_SLUG = "recupero-password"

const REDACTED_LINK = "[link personale non salvato]"
const PASSWORD_RESET_MAX_PER_HOUR = 3
const PASSWORD_RESET_MIN_INTERVAL_MS = 60_000

type LinkType = "invite" | "recovery"

type TemplateContent = {
  subject: string
  bodyHtml: string
  bodyText: string
}

// Identici al seed della migration 20260915090100_onboarding_access_email_templates.
// Usati se il template manca, è disattivato o non contiene più il link:
// l'accesso non deve bloccarsi per una modifica al template.
const DEFAULT_TEMPLATES: Record<string, TemplateContent> = {
  [ACCESS_TEMPLATE_SLUG]: {
    subject: "Il tuo accesso all'{area_nome} — {asd_nome}",
    bodyHtml: `<p>Gentile {destinatario_nome},</p>
<p>è pronto il tuo accesso all'<strong>{area_nome}</strong> di {asd_nome}, dove potrai {descrizione_area}.</p>
<p>Per attivarlo clicca sul pulsante qui sotto e scegli la tua password:</p>
<p><a href="{link_accesso}" style="display:inline-block;padding:12px 20px;background-color:#171717;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600">Attiva il mio accesso</a></p>
<p>Il link è personale e resta valido per un tempo limitato. Se non funziona più, apri <a href="{link_recupero}">{link_recupero}</a> e inserisci questo indirizzo email: ne riceverai uno nuovo.</p>
<p>Per informazioni: <a href="mailto:{asd_email}">{asd_email}</a></p>
<hr>
<p><small>{asd_nome}</small></p>`,
    bodyText: `Gentile {destinatario_nome},
è pronto il tuo accesso all'{area_nome} di {asd_nome}, dove potrai {descrizione_area}.
Per attivarlo apri questo link e scegli la tua password:
{link_accesso}
Il link è personale e resta valido per un tempo limitato. Se non funziona più, apri {link_recupero} e inserisci questo indirizzo email: ne riceverai uno nuovo.
Per informazioni: {asd_email}
{asd_nome}`,
  },
  [PASSWORD_RESET_TEMPLATE_SLUG]: {
    subject: "Imposta una nuova password — {asd_nome}",
    bodyHtml: `<p>Gentile {destinatario_nome},</p>
<p>abbiamo ricevuto una richiesta per impostare una nuova password per il tuo accesso all'area riservata di {asd_nome}.</p>
<p><a href="{link_accesso}" style="display:inline-block;padding:12px 20px;background-color:#171717;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600">Scegli una nuova password</a></p>
<p>Il link è personale e resta valido per un tempo limitato. Se è scaduto puoi richiederne un altro da <a href="{link_recupero}">{link_recupero}</a>.</p>
<p>Se non hai fatto tu questa richiesta puoi ignorare questa email: la password attuale resta valida.</p>
<hr>
<p><small>{asd_nome} · <a href="mailto:{asd_email}">{asd_email}</a></small></p>`,
    bodyText: `Gentile {destinatario_nome},
abbiamo ricevuto una richiesta per impostare una nuova password per il tuo accesso all'area riservata di {asd_nome}.
Scegli una nuova password da questo link:
{link_accesso}
Il link è personale e resta valido per un tempo limitato. Se è scaduto puoi richiederne un altro da {link_recupero}.
Se non hai fatto tu questa richiesta puoi ignorare questa email: la password attuale resta valida.
{asd_nome} · {asd_email}`,
  },
}

// ─── helpers ─────────────────────────────────────────────────────────────

// Il link deve SEMPRE partire dall'URL configurato, mai dall'header Host
// della richiesta (altrimenti "Password dimenticata" diventa un vettore di
// password-reset poisoning).
function getAppUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim()
  return url ? url.replace(/\/+$/, "") : null
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function buildConfirmLink(
  appUrl: string,
  hashedToken: string,
  type: LinkType,
  accessIntent: boolean,
): string {
  const params = new URLSearchParams({ token_hash: hashedToken, type })
  if (accessIntent) params.set("intent", "access")
  return `${appUrl}/auth/confirm?${params.toString()}`
}

async function getBrandVars(): Promise<{ asd_nome: string; asd_email: string }> {
  const brand = await prisma.brandSettings.findUnique({
    where: { id: 1 },
    select: { asdName: true, asdEmail: true },
  })
  return {
    asd_nome: brand?.asdName ?? "A.S.D. IAD Irpinia Arte Danza",
    asd_email: brand?.asdEmail ?? "info@irpiniaartedanza.it",
  }
}

type RenderedEmail = {
  templateSlug: string | null
  subject: string
  html: string
  text: string
}

async function renderPersonalEmail(
  slug: string,
  vars: Record<string, string>,
  link: string,
): Promise<RenderedEmail> {
  const fallback = DEFAULT_TEMPLATES[slug]
  const htmlVars = Object.fromEntries(
    Object.entries(vars).map(([key, value]) => [key, escapeHtml(value)]),
  )
  const renderFrom = (source: TemplateContent) => ({
    subject: substituteVariables(source.subject, vars),
    html: substituteVariables(source.bodyHtml, htmlVars),
    text: substituteVariables(source.bodyText, vars),
  })

  const template = await prisma.emailTemplate.findUnique({
    where: { slug },
    select: {
      slug: true,
      subject: true,
      bodyHtml: true,
      bodyText: true,
      isActive: true,
    },
  })

  if (template?.isActive) {
    const rendered = renderFrom({
      subject: template.subject,
      bodyHtml: template.bodyHtml,
      bodyText: template.bodyText ?? fallback.bodyText,
    })
    if (rendered.html.includes(escapeHtml(link)) && rendered.text.includes(link)) {
      return { templateSlug: template.slug, ...rendered }
    }
    console.warn("[access email] template without link, using default", { slug })
  }

  return { templateSlug: null, ...renderFrom(fallback) }
}

// Il link è una credenziale temporanea: non va salvato nello storico email.
function redactLink(content: string, link: string): string {
  return content.split(escapeHtml(link)).join(REDACTED_LINK).split(link).join(REDACTED_LINK)
}

type LinkResult =
  | { ok: true; authUserId: string; hashedToken: string; type: LinkType }
  | { ok: false; rateLimited: boolean; code: string | null }

async function generateAuthLink(type: LinkType, email: string): Promise<LinkResult> {
  try {
    const admin = createAdminClient()
    const { data, error } =
      type === "invite"
        ? await admin.auth.admin.generateLink({ type: "invite", email })
        : await admin.auth.admin.generateLink({ type: "recovery", email })

    if (error || !data.user || !data.properties?.hashed_token) {
      return {
        ok: false,
        rateLimited: error?.status === 429,
        code: error?.code ?? null,
      }
    }
    return {
      ok: true,
      authUserId: data.user.id,
      hashedToken: data.properties.hashed_token,
      type,
    }
  } catch (error) {
    console.error("[access email] generateLink threw", {
      message: error instanceof Error ? error.message : "unknown",
    })
    return { ok: false, rateLimited: false, code: null }
  }
}

function mapEmailFailure(code: string | undefined): {
  code: AccessInviteErrorCode
  error: string
} {
  switch (code) {
    case "rate_limit_exceeded":
      return {
        code: "RATE_LIMIT",
        error:
          "Limite di invio raggiunto: troppe email in pochi secondi. Attendi un minuto e rilancia l'invio sui restanti.",
      }
    case "daily_quota_exceeded":
      return {
        code: "RATE_LIMIT",
        error:
          "Raggiunto il limite giornaliero di email del servizio di invio. Riprova domani sui restanti.",
      }
    case "monthly_quota_exceeded":
      return {
        code: "RATE_LIMIT",
        error:
          "Raggiunto il limite mensile di email del servizio di invio: contatta l'assistenza.",
      }
    case "validation_error":
      return {
        code: "SEND_FAILED",
        error: "L'indirizzo email non risulta valido: correggilo e riprova.",
      }
    default:
      return {
        code: "SEND_FAILED",
        error: "L'email non è partita. Controlla l'indirizzo e riprova tra qualche istante.",
      }
  }
}

type DeliverParams = {
  to: string
  recipientName: string | null
  email: RenderedEmail
  link: string
  sentBy: string
  parentId: string | null
  // Allieva con accesso proprio: collega il log al suo profilo, così lo
  // stato dell'accesso si ricava come per i genitori
  athleteId?: string | null
  triggeredBy: EmailTrigger
  milestoneKey: string
}

type DeliverResult =
  | { ok: true; logId: string }
  | { ok: false; logId: string; failure: { code: AccessInviteErrorCode; error: string } }

async function deliverAndLog(params: DeliverParams): Promise<DeliverResult> {
  const result = await sendEmail({
    to: params.to,
    subject: params.email.subject,
    html: params.email.html,
    text: params.email.text,
  })

  const log = await prisma.emailLog.create({
    data: {
      sentBy: params.sentBy,
      recipientEmail: params.to,
      recipientName: params.recipientName,
      templateSlug: params.email.templateSlug,
      subject: params.email.subject,
      bodyHtml: redactLink(params.email.html, params.link),
      bodyText: redactLink(params.email.text, params.link),
      parentId: params.parentId,
      athleteId: params.athleteId ?? null,
      status: result.success ? EmailStatus.SENT : EmailStatus.FAILED,
      providerId: result.success ? result.providerId : null,
      errorMessage: result.success ? null : result.error,
      triggeredBy: params.triggeredBy,
      milestoneKey: params.milestoneKey,
    },
    select: { id: true },
  })

  if (result.success) return { ok: true, logId: log.id }
  return { ok: false, logId: log.id, failure: mapEmailFailure(result.code) }
}

function fail(code: AccessInviteErrorCode, error: string): AccessInviteResult {
  return { ok: false, code, error }
}

// ─── invito accesso (admin) ──────────────────────────────────────────────

const USER_WITH_PROFILES_SELECT = {
  id: true,
  email: true,
  role: true,
  parentProfile: {
    select: { id: true, firstName: true, lastName: true, deletedAt: true },
  },
  teacherProfile: {
    select: { id: true, firstName: true, lastName: true, deletedAt: true },
  },
  athleteProfile: {
    select: { id: true, firstName: true, lastName: true, deletedAt: true },
  },
} satisfies Prisma.UserSelect

type UserWithProfiles = Prisma.UserGetPayload<{
  select: typeof USER_WITH_PROFILES_SELECT
}>

// Account che non si può usare per questo profilo: amministratore oppure
// già collegato a un altro profilo attivo.
function describeConflict(
  user: UserWithProfiles,
  kind: AccessProfileKind,
  profileId: string,
): string | null {
  if (user.role === UserRole.ADMIN) {
    return "Questa email appartiene a un account amministratore: usa un indirizzo diverso."
  }
  const parent = user.parentProfile
  if (parent && !parent.deletedAt && !(kind === "PARENT" && parent.id === profileId)) {
    return `Questa email è già usata dal genitore ${parent.firstName} ${parent.lastName}.`
  }
  const teacher = user.teacherProfile
  if (teacher && !teacher.deletedAt && !(kind === "TEACHER" && teacher.id === profileId)) {
    return `Questa email è già usata dall'insegnante ${teacher.firstName} ${teacher.lastName}.`
  }
  const athlete = user.athleteProfile
  if (athlete && !athlete.deletedAt && !(kind === "ATHLETE" && athlete.id === profileId)) {
    return `Questa email è già usata dall'allieva ${athlete.firstName} ${athlete.lastName}.`
  }
  return null
}

// Utente Prisma senza account Supabase (orfani di test, account cancellato
// dalla dashboard): non può più accedere. Si libera l'email così il profilo
// può ricevere un account nuovo, senza toccare lo storico collegato.
async function retireStaleUser(userId: string, adminUserId: string): Promise<void> {
  await prisma.$transaction([
    prisma.parent.updateMany({ where: { userId }, data: { userId: null } }),
    prisma.teacher.updateMany({ where: { userId }, data: { userId: null } }),
    prisma.athlete.updateMany({ where: { userId }, data: { userId: null } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        email: `retired-${userId}@invalid.local`,
        isActive: false,
        deletedAt: new Date(),
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: "UPDATE",
        entityType: "User",
        entityId: userId,
        changes: { reason: "stale-user-without-auth-account-retired" },
      },
    }),
  ])
}

async function loadProfile(kind: AccessProfileKind, profileId: string) {
  const select = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    userId: true,
  } as const
  if (kind === "PARENT") {
    return prisma.parent.findFirst({ where: { id: profileId, deletedAt: null }, select })
  }
  if (kind === "TEACHER") {
    return prisma.teacher.findFirst({ where: { id: profileId, deletedAt: null }, select })
  }
  return prisma.athlete.findFirst({ where: { id: profileId, deletedAt: null }, select })
}

// La regola sta in athleteAccessEligibility: qui si leggono solo i dati che
// le servono. Il controllo vive nel motore, così non si aggira passando da
// un'altra strada.
async function athleteAccessBlocker(athleteId: string): Promise<string | null> {
  const [athlete, linkedParents] = await Promise.all([
    prisma.athlete.findUnique({
      where: { id: athleteId },
      select: { dateOfBirth: true },
    }),
    prisma.athleteParent.count({
      where: { athleteId, parent: { deletedAt: null } },
    }),
  ])
  if (!athlete) return "Allieva non trovata"

  const eligibility = athleteAccessEligibility({
    dateOfBirth: athlete.dateOfBirth,
    linkedParents,
  })
  return eligibility.ok ? null : eligibility.message
}

type InviteParams = {
  kind: AccessProfileKind
  profileId: string
  adminUserId: string
}

export async function sendAccessInviteCore(
  params: InviteParams,
): Promise<AccessInviteResult> {
  try {
    return await sendAccessInviteUnsafe(params)
  } catch (error) {
    console.error("[access invite] unexpected error", {
      kind: params.kind,
      profileId: params.profileId,
      message: error instanceof Error ? error.message : "unknown",
    })
    return fail(
      "SEND_FAILED",
      "Errore imprevisto durante l'invio: riprova tra qualche istante.",
    )
  }
}

async function sendAccessInviteUnsafe({
  kind,
  profileId,
  adminUserId,
}: InviteParams): Promise<AccessInviteResult> {
  const profile = await loadProfile(kind, profileId)
  if (!profile) {
    return fail(
      "NOT_FOUND",
      kind === "PARENT"
        ? "Genitore non trovato"
        : kind === "TEACHER"
          ? "Insegnante non trovato"
          : "Allieva non trovata",
    )
  }

  if (kind === "ATHLETE") {
    const blocker = await athleteAccessBlocker(profile.id)
    if (blocker) return fail("NOT_ELIGIBLE", blocker)
  }

  const email = normalizeEmail(profile.email)
  if (!email) {
    return fail("NO_EMAIL", "Manca l'indirizzo email: aggiungilo prima di inviare l'accesso.")
  }

  const appUrl = getAppUrl()
  if (!appUrl) {
    console.error("[access invite] NEXT_PUBLIC_APP_URL missing")
    return fail(
      "CONFIG",
      "Configurazione del portale incompleta (indirizzo del sito mancante): contatta l'assistenza.",
    )
  }

  // 1. Account già collegato al profilo
  let linkedUser = profile.userId
    ? await prisma.user.findUnique({
        where: { id: profile.userId },
        select: USER_WITH_PROFILES_SELECT,
      })
    : null
  if (linkedUser) {
    const conflict = describeConflict(linkedUser, kind, profile.id)
    if (conflict) return fail("EMAIL_CONFLICT", conflict)
  }

  let linkedAuth: AuthUserInfo | null = linkedUser
    ? (await getAuthUsersByIds([linkedUser.id])).get(linkedUser.id) ?? null
    : null
  if (linkedAuth?.hasPassword) {
    return fail(
      "ALREADY_ACTIVE",
      "L'accesso è già attivo. Se la password è stata dimenticata si può usare «Password dimenticata» nella pagina di accesso.",
    )
  }
  if (linkedUser && !linkedAuth) {
    await retireStaleUser(linkedUser.id, adminUserId)
    linkedUser = null
  }

  // 2. Altri account con la stessa email (lato Prisma o Supabase)
  const authByEmail = await findAuthUserByEmail(email)
  const candidates = await prisma.user.findMany({
    where: {
      OR: [
        { email: { equals: email, mode: "insensitive" } },
        ...(authByEmail ? [{ id: authByEmail.id }] : []),
      ],
      ...(linkedUser ? { NOT: { id: linkedUser.id } } : {}),
    },
    select: USER_WITH_PROFILES_SELECT,
  })
  for (const candidate of candidates) {
    const conflict = describeConflict(candidate, kind, profile.id)
    if (conflict) return fail("EMAIL_CONFLICT", conflict)
  }
  const candidateAuth = await getAuthUsersByIds(candidates.map((c) => c.id))
  for (const candidate of candidates) {
    if (!candidateAuth.has(candidate.id)) {
      await retireStaleUser(candidate.id, adminUserId)
    }
  }

  // 3. Account Supabase di destinazione
  let target: AuthUserInfo | null = null
  if (authByEmail && authByEmail.id !== linkedAuth?.id) {
    // Esiste già un account con questa email (es. profilo ricreato dopo
    // il cestino): lo si riusa invece di crearne un doppione.
    target = authByEmail
  } else if (linkedAuth) {
    target = linkedAuth
    if (normalizeEmail(linkedAuth.email) !== email) {
      // Email corretta dopo un invito (es. errore di battitura): l'account
      // non ancora attivato segue il nuovo indirizzo.
      const admin = createAdminClient()
      const { error } = await admin.auth.admin.updateUserById(linkedAuth.id, { email })
      if (error) {
        console.error("[access invite] email update failed", { code: error.code })
        return fail(
          "LINK_FAILED",
          "Non è stato possibile aggiornare l'email dell'account: riprova tra qualche istante.",
        )
      }
      linkedAuth = (await getAuthUsersByIds([linkedAuth.id])).get(linkedAuth.id) ?? null
      target = linkedAuth
    }
  }

  // Account mai confermato → link di invito (sostituisce il token precedente).
  // Account già confermato ma senza password → link di recupero.
  let link = await generateAuthLink(target?.emailConfirmedAt ? "recovery" : "invite", email)
  if (!link.ok && link.code === "email_exists") {
    link = await generateAuthLink("recovery", email)
  }
  if (!link.ok) {
    if (link.rateLimited) {
      return fail(
        "RATE_LIMIT",
        "Il servizio di autenticazione ha ricevuto troppe richieste: attendi qualche minuto e rilancia l'invio sui restanti.",
      )
    }
    console.error("[access invite] generateLink failed", { code: link.code })
    return fail(
      "LINK_FAILED",
      "Non è stato possibile generare il link di accesso: riprova tra qualche istante.",
    )
  }

  // 4. Collega account e profilo
  const authUserId = link.authUserId
  const role =
    kind === "PARENT"
      ? UserRole.PARENT
      : kind === "TEACHER"
        ? UserRole.TEACHER
        : UserRole.ATHLETE
  await prisma.$transaction(async (tx) => {
    // Un account appartiene a un solo profilo: sgancia eventuali profili nel
    // cestino ancora collegati (quelli attivi sono già esclusi sopra).
    await tx.parent.updateMany({
      where: {
        userId: authUserId,
        ...(kind === "PARENT" ? { NOT: { id: profile.id } } : {}),
      },
      data: { userId: null },
    })
    await tx.teacher.updateMany({
      where: {
        userId: authUserId,
        ...(kind === "TEACHER" ? { NOT: { id: profile.id } } : {}),
      },
      data: { userId: null },
    })
    await tx.athlete.updateMany({
      where: {
        userId: authUserId,
        ...(kind === "ATHLETE" ? { NOT: { id: profile.id } } : {}),
      },
      data: { userId: null },
    })
    await tx.user.upsert({
      where: { id: authUserId },
      update: {
        email,
        role,
        firstName: profile.firstName,
        lastName: profile.lastName,
        isActive: true,
        deletedAt: null,
      },
      create: {
        id: authUserId,
        email,
        role,
        firstName: profile.firstName,
        lastName: profile.lastName,
        isActive: true,
      },
    })
    if (kind === "PARENT") {
      await tx.parent.update({ where: { id: profile.id }, data: { userId: authUserId } })
    } else if (kind === "TEACHER") {
      await tx.teacher.update({ where: { id: profile.id }, data: { userId: authUserId } })
    } else {
      await tx.athlete.update({ where: { id: profile.id }, data: { userId: authUserId } })
    }
  })

  // 5. Email
  const previousInvites = await prisma.emailLog.count({
    where: {
      recipientEmail: email,
      milestoneKey: { in: [...ACCESS_MILESTONES] },
      status: { not: EmailStatus.FAILED },
      parentId: kind === "PARENT" ? profile.id : null,
      athleteId: kind === "ATHLETE" ? profile.id : null,
    },
  })
  const reinvite = previousInvites > 0

  const recipientName = `${profile.firstName} ${profile.lastName}`.trim()
  const confirmLink = buildConfirmLink(appUrl, link.hashedToken, link.type, true)
  const rendered = await renderPersonalEmail(
    ACCESS_TEMPLATE_SLUG,
    {
      destinatario_nome: recipientName,
      area_nome:
        kind === "PARENT"
          ? "area genitori"
          : kind === "TEACHER"
            ? "area insegnanti"
            : "area riservata",
      descrizione_area:
        kind === "PARENT"
          ? "consultare contributi, ricevute, presenze e orari delle tue figlie"
          : kind === "TEACHER"
            ? "vedere le tue classi e segnare le presenze"
            : "consultare i tuoi contributi, le ricevute, le presenze e gli orari",
      link_accesso: confirmLink,
      link_recupero: `${appUrl}/password-dimenticata`,
      ...(await getBrandVars()),
    },
    confirmLink,
  )

  const delivery = await deliverAndLog({
    to: email,
    recipientName,
    email: rendered,
    link: confirmLink,
    sentBy: adminUserId,
    parentId: kind === "PARENT" ? profile.id : null,
    athleteId: kind === "ATHLETE" ? profile.id : null,
    triggeredBy: EmailTrigger.ADMIN_MANUAL,
    milestoneKey: reinvite ? ACCESS_REINVITE_MILESTONE : ACCESS_INVITE_MILESTONE,
  })
  if (!delivery.ok) return fail(delivery.failure.code, delivery.failure.error)

  await prisma.auditLog.create({
    data: {
      userId: adminUserId,
      action:
        kind === "PARENT"
          ? "INVITE_PARENT"
          : kind === "TEACHER"
            ? "INVITE_TEACHER"
            : "INVITE_ATHLETE",
      entityType:
        kind === "PARENT" ? "Parent" : kind === "TEACHER" ? "Teacher" : "Athlete",
      entityId: profile.id,
      changes: {
        email,
        authUserId,
        linkType: link.type,
        reinvite,
        emailLogId: delivery.logId,
      },
    },
  })

  return { ok: true, reinvite }
}

// ─── recupero password (self-service) ────────────────────────────────────

async function resolveRecipientName(
  state: Extract<AccountState, { state: "ok" }>,
  fallback: { firstName: string | null; lastName: string | null },
): Promise<string> {
  const profile = state.parentId
    ? await prisma.parent.findUnique({
        where: { id: state.parentId },
        select: { firstName: true, lastName: true },
      })
    : state.teacherId
      ? await prisma.teacher.findUnique({
          where: { id: state.teacherId },
          select: { firstName: true, lastName: true },
        })
      : state.athleteId
        ? await prisma.athlete.findUnique({
            where: { id: state.athleteId },
            select: { firstName: true, lastName: true },
          })
        : null
  const name = [profile?.firstName ?? fallback.firstName, profile?.lastName ?? fallback.lastName]
    .filter(Boolean)
    .join(" ")
    .trim()
  return name || "utente"
}

// Silenzioso per costruzione: non restituisce nulla al chiamante, così la
// risposta della pagina è identica per email esistenti e inesistenti.
export async function sendPasswordResetCore(rawEmail: string): Promise<void> {
  const email = normalizeEmail(rawEmail)
  if (!email) return

  const appUrl = getAppUrl()
  if (!appUrl) {
    console.error("[password reset] NEXT_PUBLIC_APP_URL missing")
    return
  }

  const user = await prisma.user.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      isActive: true,
      deletedAt: null,
    },
    select: { id: true, firstName: true, lastName: true },
  })
  if (!user) return

  const state = await resolveAccountState(user.id)
  if (state.state !== "ok") return

  const authUser = (await getAuthUsersByIds([user.id])).get(user.id)
  if (!authUser?.email) return

  // Anti-abuso: max 3 email/ora e almeno 1 minuto tra una e l'altra per
  // lo stesso indirizzo.
  const recent = await prisma.emailLog.findMany({
    where: {
      recipientEmail: email,
      milestoneKey: PASSWORD_RESET_MILESTONE,
      sentAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
    select: { sentAt: true },
    orderBy: { sentAt: "desc" },
    take: PASSWORD_RESET_MAX_PER_HOUR,
  })
  if (recent.length >= PASSWORD_RESET_MAX_PER_HOUR) return
  if (recent[0] && Date.now() - recent[0].sentAt.getTime() < PASSWORD_RESET_MIN_INTERVAL_MS) {
    return
  }

  // Il recupero funziona anche per chi è stato invitato ma non ha mai
  // attivato l'accesso: la verifica del link conferma anche l'email.
  const link = await generateAuthLink("recovery", authUser.email)
  if (!link.ok) {
    console.error("[password reset] generateLink failed", { code: link.code })
    return
  }

  const recipientName = await resolveRecipientName(state, user)
  const confirmLink = buildConfirmLink(appUrl, link.hashedToken, "recovery", false)
  const rendered = await renderPersonalEmail(
    PASSWORD_RESET_TEMPLATE_SLUG,
    {
      destinatario_nome: recipientName,
      link_accesso: confirmLink,
      link_recupero: `${appUrl}/password-dimenticata`,
      ...(await getBrandVars()),
    },
    confirmLink,
  )

  const delivery = await deliverAndLog({
    to: email,
    recipientName,
    email: rendered,
    link: confirmLink,
    sentBy: user.id,
    parentId: state.parentId,
    triggeredBy: EmailTrigger.SELF_SERVICE,
    milestoneKey: PASSWORD_RESET_MILESTONE,
  })
  if (!delivery.ok) {
    console.error("[password reset] email not sent", { code: delivery.failure.code })
  }
}
