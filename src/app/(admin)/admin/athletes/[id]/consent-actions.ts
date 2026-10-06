"use server"

import { revalidatePath } from "next/cache"

import { ConsentMethod, Prisma, type ConsentType } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import type { ActionResult } from "@/lib/schemas/common"
import { uuidSchema } from "@/lib/schemas/common"
import {
  consentSchema,
  SIGNED_BY_ATHLETE,
  type ConsentValues,
} from "@/lib/schemas/consent"
import {
  CONSENT_FILE_ALLOWED_MIME,
  CONSENT_FILE_MAX_BYTES,
} from "@/lib/consents/file-rules"
import {
  deleteConsentFiles,
  getConsentFileSignedUrl,
  uploadConsentFile,
} from "@/lib/supabase/storage-consent"
import { isMinorAt } from "@/lib/utils/age"
import { toDateOnly } from "@/lib/utils/date-only"
import { validateFileSignature } from "@/lib/utils/file-signature"

// ─────────────────────────────────────────────────────────────────────────
// Consensi cartacei: la segreteria registra la firma sul modulo di carta.
//
// Il modulo resta in archivio; qui si scrive che c'è, quando è stato
// firmato e da chi. Niente firma online, niente IP: method è sempre PAPER.
// Cancellare vuol dire Cestino (deletedAt), con ripristino: un consenso
// registrato per sbaglio si toglie, uno tolto per sbaglio si rimette, e
// nessuna delle due cose cancella una riga.
//
// Il modulo firmato si può allegare (bucket privato "consents"). Il Cestino
// non tocca mai il file: lo stesso modulo può stare su altri consensi, e il
// consenso ripristinato deve ritrovarlo. Il file si toglie solo quando
// nessuna riga lo punta più (cancellazione definitiva, vedi
// src/lib/consents/shared-file.ts).
// ─────────────────────────────────────────────────────────────────────────

function mapPrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2003") return "Allieva non trovata"
    if (error.code === "P2025") return "Consenso non trovato"
  }
  console.error("[consent action] error", error)
  return "Errore interno, riprova"
}

// Scheda, elenco (chip «Senza consenso privacy») e dashboard (riquadro)
function revalidateAthlete(athleteId: string) {
  revalidatePath(`/admin/athletes/${athleteId}`)
  revalidatePath("/admin/athletes")
  revalidatePath("/admin/dashboard")
}

function parseForm(formData: FormData): ConsentValues | { error: string } {
  const text = (key: string) => {
    const v = formData.get(key)
    return typeof v === "string" ? v : ""
  }
  const signedOn = text("signedOn")
  const parsed = consentSchema.safeParse({
    kinds: formData.getAll("kinds").filter((v) => typeof v === "string"),
    alsoFor: formData.getAll("alsoFor").filter((v) => typeof v === "string"),
    signedOn: signedOn ? new Date(signedOn) : undefined,
    signedBy: text("signedBy"),
    notes: text("notes"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" }
  }
  return parsed.data
}

function fileFromForm(formData: FormData): File | null {
  const f = formData.get("file")
  if (!(f instanceof File) || f.size === 0) return null
  return f
}

async function validateFile(file: File): Promise<string | null> {
  if (file.size > CONSENT_FILE_MAX_BYTES) return "File troppo grande (max 3 MB)"
  if (!(CONSENT_FILE_ALLOWED_MIME as readonly string[]).includes(file.type)) {
    return `Formato non supportato (${file.type}). Ammessi: PDF, JPEG, PNG.`
  }
  return validateFileSignature(file, CONSENT_FILE_ALLOWED_MIME)
}

// Una registrazione: uno o più consensi della stessa allieva, con lo stesso
// modulo firmato. `alsoFor` (stesso modulo anche a una sorella) resta
// supportato qui ma nessuna interfaccia lo manda: ogni sorella ha il suo
// modulo e si registra dalla propria scheda. Il file si carica una volta sola
// e tutte le righe ne portano il percorso.
export async function registerConsents(
  athleteId: string,
  formData: FormData,
): Promise<ActionResult<{ created: number }>> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(athleteId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo allieva non valido" }
  }
  const values = parseForm(formData)
  if ("error" in values) return { ok: false, error: values.error }

  const file = fileFromForm(formData)
  if (file) {
    const fileError = await validateFile(file)
    if (fileError) return { ok: false, error: fileError }
  }

  let filePath: string | null = null
  try {
    const athlete = await prisma.athlete.findUnique({
      where: { id: idParsed.data, deletedAt: null },
      select: {
        id: true,
        dateOfBirth: true,
        parentRelations: {
          where: { parent: { deletedAt: null } },
          select: { parentId: true },
        },
      },
    })
    if (!athlete) return { ok: false, error: "Allieva non trovata" }

    // Chi firma: un genitore collegato, oppure l'allieva se maggiorenne. Il
    // controllo sta qui e non solo nel form: l'id arriva dal client.
    let parentId: string | null = null
    if (values.signedBy === SIGNED_BY_ATHLETE) {
      if (isMinorAt(athlete.dateOfBirth, new Date())) {
        return {
          ok: false,
          error: "È minorenne: il consenso lo firma un genitore",
        }
      }
    } else {
      const signer = uuidSchema.safeParse(values.signedBy)
      const linked =
        signer.success &&
        athlete.parentRelations.some((r) => r.parentId === signer.data)
      if (!linked) {
        return {
          ok: false,
          error: "Chi ha firmato deve essere un genitore collegato",
        }
      }
      parentId = signer.data as string
    }

    // Le sorelle: solo allieve collegate allo stesso genitore che ha
    // firmato. Un'allieva che firma per sé non firma per altre.
    const sisterIds = [...new Set(values.alsoFor)].filter(
      (id) => id !== athlete.id,
    )
    if (sisterIds.length > 0) {
      const sisters = parentId
        ? await prisma.athlete.count({
            where: {
              id: { in: sisterIds },
              deletedAt: null,
              parentRelations: { some: { parentId } },
            },
          })
        : 0
      if (sisters !== sisterIds.length) {
        return {
          ok: false,
          error:
            "Il modulo si può registrare solo alle sorelle collegate allo stesso genitore",
        }
      }
    }

    // La versione del documento: l'anno accademico in cui è stato firmato,
    // che è anche l'anno del modulo di iscrizione
    const signedOn = toDateOnly(values.signedOn)
    const year = await prisma.academicYear.findFirst({
      where: { startDate: { lte: signedOn }, endDate: { gte: signedOn } },
      select: { label: true },
    })

    if (file) filePath = await uploadConsentFile(file)

    const athleteIds = [athlete.id, ...sisterIds]
    const kinds = [...new Set(values.kinds)]
    const rows = athleteIds.flatMap((id) =>
      kinds.map((kind) => ({
        athleteId: id,
        parentId,
        type: kind as ConsentType,
        accepted: true,
        documentVersion: year?.label ?? String(signedOn.getUTCFullYear()),
        method: ConsentMethod.PAPER,
        acceptedAt: signedOn,
        notes: values.notes && values.notes !== "" ? values.notes : null,
        filePath,
      })),
    )

    const created = await prisma.$transaction(
      rows.map((data) =>
        prisma.consent.create({ data, select: { id: true, athleteId: true } }),
      ),
    )

    await prisma.auditLog.createMany({
      data: created.map((consent, index) => ({
        userId,
        action: "CREATE" as const,
        entityType: "Consent",
        entityId: consent.id,
        changes: {
          athleteId: consent.athleteId,
          type: rows[index].type,
          signedBy: parentId ? "parent" : "athlete",
          fileAttached: filePath !== null,
        },
      })),
    })

    for (const id of athleteIds) revalidateAthlete(id)
    return { ok: true, data: { created: created.length } }
  } catch (error) {
    // Il file è salito ma le righe no: non deve restare un modulo che
    // nessun consenso punta
    if (filePath) await deleteConsentFiles([filePath])
    if (error instanceof Error && /Upload fallito|Storage|Bucket/.test(error.message)) {
      return { ok: false, error: error.message }
    }
    return { ok: false, error: mapPrismaError(error) }
  }
}

// Il link al modulo firmato, generato al clic su «Scarica»: vive cinque
// minuti (SIGNED_URL_TTL_SECONDS) e non si salva. Vale anche per un consenso
// nel Cestino: il file resta finché una riga lo punta.
export async function getConsentFileUrl(
  consentId: string,
): Promise<ActionResult<{ signedUrl: string }>> {
  await requireAdmin()

  const idParsed = uuidSchema.safeParse(consentId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo consenso non valido" }
  }
  const consent = await prisma.consent.findUnique({
    where: { id: idParsed.data },
    select: { filePath: true },
  })
  if (!consent) return { ok: false, error: "Consenso non trovato" }
  if (!consent.filePath) return { ok: false, error: "Nessun modulo allegato" }

  const url = await getConsentFileSignedUrl(consent.filePath)
  if (!url) return { ok: false, error: "Impossibile generare il link" }
  return { ok: true, data: { signedUrl: url } }
}

export async function softDeleteConsent(
  consentId: string,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(consentId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo consenso non valido" }
  }

  try {
    const existing = await prisma.consent.findUnique({
      where: { id: idParsed.data },
      select: { id: true, athleteId: true, deletedAt: true },
    })
    if (!existing || !existing.athleteId) {
      return { ok: false, error: "Consenso non trovato" }
    }
    if (existing.deletedAt) return { ok: true } // idempotente

    await prisma.consent.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "SOFT_DELETE",
        entityType: "Consent",
        entityId: existing.id,
      },
    })

    revalidateAthlete(existing.athleteId)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function restoreConsent(consentId: string): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(consentId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo consenso non valido" }
  }

  try {
    const existing = await prisma.consent.findUnique({
      where: { id: idParsed.data },
      select: { id: true, athleteId: true, deletedAt: true },
    })
    if (!existing || !existing.athleteId) {
      return { ok: false, error: "Consenso non trovato" }
    }
    if (!existing.deletedAt) return { ok: true } // idempotente

    await prisma.consent.update({
      where: { id: existing.id },
      data: { deletedAt: null },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "RESTORE",
        entityType: "Consent",
        entityId: existing.id,
      },
    })

    revalidateAthlete(existing.athleteId)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}
