"use server"

import { revalidatePath } from "next/cache"

import { AffiliationEntity, AffiliationStatus, Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import { cardFileError, CARD_MAX_FILES_PER_BATCH } from "@/lib/affiliations/file-rules"
import type { ExistingCard } from "@/lib/affiliations/import-plan"
import { matchAthlete, type MatchCandidate } from "@/lib/affiliations/name-match"
import {
  cardParserFor,
  type CardEntity,
  type CardParseResult,
} from "@/lib/affiliations/parsers"
import { extractPdfText } from "@/lib/pdf/extract-pdf-text"
import type { ActionResult } from "@/lib/schemas/common"
import { uuidSchema } from "@/lib/schemas/common"
import {
  getAffiliationCardSignedUrl,
  uploadAffiliationCardFile,
} from "@/lib/supabase/storage-affiliation-card"
import { detectMimeFromSignature } from "@/lib/utils/file-signature"

import { getActiveCards, getMatchCandidates } from "./queries"

const TESSERE_PATH = "/admin/tessere"

function revalidateCards(athleteId?: string) {
  revalidatePath(TESSERE_PATH)
  revalidatePath("/admin/athletes")
  if (athleteId) revalidatePath(`/admin/athletes/${athleteId}`)
}

function mapPrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return "Questa allieva ha già una tessera per quell'anno"
    }
    if (error.code === "P2003") return "Allieva non trovata"
    if (error.code === "P2025") return "Tessera non trovata"
  }
  console.error("[tessere action] error", error)
  return "Errore interno, riprova"
}

function isSupportedEntity(value: unknown): value is CardEntity {
  return value === "ENDAS" || value === "CSEN"
}

function readEntity(formData: FormData): CardEntity | null {
  const raw = formData.get("entity")
  return isSupportedEntity(raw) ? raw : null
}

// Un file diventa un esito di lettura: PDF → testo → tessera. Gli errori non
// interrompono il lotto, diventano la riga scartata di quel file.
async function parseOneFile(
  entity: CardEntity,
  file: File,
): Promise<CardParseResult> {
  const fileError = cardFileError(file)
  if (fileError) return { ok: false, reason: "UNREADABLE", missing: [fileError] }

  const bytes = await file.arrayBuffer()
  if (detectMimeFromSignature(bytes) !== "application/pdf") {
    return { ok: false, reason: "UNREADABLE", missing: ["non è un PDF"] }
  }

  const text = await extractPdfText(bytes)
  if (!text.ok) {
    return {
      ok: false,
      reason: "UNREADABLE",
      missing: [
        text.reason === "EMPTY"
          ? "il PDF non contiene testo (è una scansione?)"
          : "il PDF non si apre",
      ],
    }
  }

  const parser = cardParserFor(entity)
  if (!parser) return { ok: false, reason: "OTHER_ENTITY" }
  return parser.parse(text.text)
}

export type ParsedFile = {
  index: number
  fileName: string
  parsed: CardParseResult
}

export type CardImportPreview = {
  files: ParsedFile[]
  athletes: MatchCandidate[]
  existingCards: ExistingCard[]
}

// Anteprima del lotto: legge i PDF e restituisce cosa c'è scritto, più quello
// che serve per abbinare. Il piano vero e proprio (chi va con chi, cosa è
// duplicato) lo costruisce il browser con `buildImportPlan`, così si aggiorna
// da solo a ogni abbinamento a mano e resta corretto anche quando i file
// vengono letti a scaglioni.
//
// NON scrive niente — né in DB né su Storage. I file tornano al server una
// seconda volta alla conferma, ed è il prezzo di questa garanzia.
export async function previewCardImport(
  formData: FormData,
): Promise<ActionResult<CardImportPreview>> {
  await requireAdmin()

  const entity = readEntity(formData)
  if (!entity) return { ok: false, error: "Ente non valido" }
  if (!cardParserFor(entity)) {
    return {
      ok: false,
      error: `Il PDF ${entity} non lo sappiamo ancora leggere`,
    }
  }

  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File)
  if (files.length === 0) return { ok: false, error: "Nessun file da leggere" }
  if (files.length > CARD_MAX_FILES_PER_BATCH) {
    return {
      ok: false,
      error: `Troppi file insieme (max ${CARD_MAX_FILES_PER_BATCH})`,
    }
  }

  // Indice di partenza: il browser manda il lotto a scaglioni, così le righe
  // restano numerate come i file scelti da Giuseppina
  const offset = Number(formData.get("offset") ?? 0)
  const startIndex = Number.isInteger(offset) && offset >= 0 ? offset : 0

  const parsed = await Promise.all(
    files.map(async (file, i) => ({
      index: startIndex + i,
      fileName: file.name,
      parsed: await parseOneFile(entity, file),
    })),
  )

  const [athletes, existingCards] = await Promise.all([
    getMatchCandidates(),
    getActiveCards(entity as AffiliationEntity),
  ])

  return { ok: true, data: { files: parsed, athletes, existingCards } }
}

export type SavedCard = {
  cardId: string
  athleteId: string
  cardNumber: string
}

// Salvataggio di una tessera: il file torna al server e viene riletto da capo.
// Quello che il browser ha mostrato nell'anteprima non fa fede — i controlli
// che contano (già presente, già caricata, allieva esistente) si rifanno qui.
export async function importCardFile(
  formData: FormData,
): Promise<ActionResult<SavedCard>> {
  const { userId } = await requireAdmin()

  const entity = readEntity(formData)
  if (!entity) return { ok: false, error: "Ente non valido" }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "File mancante" }
  }

  const parsed = await parseOneFile(entity, file)
  if (!parsed.ok) {
    return {
      ok: false,
      error:
        parsed.reason === "OTHER_ENTITY"
          ? `Non è una tessera ${entity}`
          : `Tessera illeggibile: manca ${parsed.missing.join(", ")}`,
    }
  }
  const card = parsed.card

  // Abbinamento: quello scelto a mano vince, altrimenti si rifà il confronto
  const rawAthleteId = formData.get("athleteId")
  let athleteId: string
  if (typeof rawAthleteId === "string" && rawAthleteId.length > 0) {
    const idParsed = uuidSchema.safeParse(rawAthleteId)
    if (!idParsed.success) {
      return { ok: false, error: "Identificativo allieva non valido" }
    }
    athleteId = idParsed.data
  } else {
    if (!card.person) {
      return { ok: false, error: "Intestataria non leggibile: abbinala a mano" }
    }
    const athletes = await getMatchCandidates()
    const match = matchAthlete(card.person, athletes)
    if (match.status !== "matched") {
      return {
        ok: false,
        error:
          match.status === "ambiguous"
            ? "Più di un'allieva corrisponde: scegli tu"
            : "Nessuna allieva corrisponde: abbinala a mano",
      }
    }
    athleteId = match.athleteId
  }

  try {
    const athlete = await prisma.athlete.findFirst({
      where: { id: athleteId, deletedAt: null },
      select: { id: true },
    })
    if (!athlete) return { ok: false, error: "Allieva non trovata" }

    const prismaEntity = entity as AffiliationEntity

    const duplicateNumber = await prisma.affiliation.findFirst({
      where: {
        deletedAt: null,
        entity: prismaEntity,
        cardNumber: card.cardNumber,
      },
      select: { id: true },
    })
    if (duplicateNumber) {
      return {
        ok: false,
        error: `La tessera n. ${card.cardNumber} è già in archivio`,
      }
    }

    const sameYear = await prisma.affiliation.findFirst({
      where: {
        deletedAt: null,
        entity: prismaEntity,
        athleteId,
        cardYear: card.cardYear,
      },
      select: { id: true },
    })
    if (sameYear) {
      return {
        ok: false,
        error: `Questa allieva ha già una tessera ${entity} per l'anno ${card.cardYear}`,
      }
    }

    const created = await prisma.affiliation.create({
      data: {
        athleteId,
        entity: prismaEntity,
        // La tessera in mano è il tesseramento confermato: il numero c'è
        status: AffiliationStatus.CONFIRMED,
        confirmedAt: new Date(),
        cardNumber: card.cardNumber,
        cardType: card.cardType,
        cardYear: card.cardYear,
        issueDate: card.issueDate,
        expiryDate: card.expiryDate,
        createdBy: userId,
      },
      select: { id: true },
    })

    try {
      const uploaded = await uploadAffiliationCardFile(
        athleteId,
        created.id,
        await file.arrayBuffer(),
      )
      await prisma.affiliation.update({
        where: { id: created.id },
        data: { filePath: uploaded.filePath, fileUrl: uploaded.signedUrl },
      })
    } catch (uploadError) {
      // Senza il PDF la tessera non serve: si torna indietro del tutto
      await prisma.affiliation.delete({ where: { id: created.id } })
      return {
        ok: false,
        error:
          uploadError instanceof Error
            ? uploadError.message
            : "Upload fallito",
      }
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: "CARD_IMPORT",
        entityType: "Affiliation",
        entityId: created.id,
        changes: {
          athleteId,
          entity,
          cardNumber: card.cardNumber,
          cardYear: card.cardYear,
          manualMatch: typeof rawAthleteId === "string" && rawAthleteId !== "",
        },
      },
    })

    revalidateCards(athleteId)
    return {
      ok: true,
      data: {
        cardId: created.id,
        athleteId,
        cardNumber: card.cardNumber,
      },
    }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function softDeleteCard(cardId: string): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(cardId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo tessera non valido" }
  }

  try {
    const existing = await prisma.affiliation.findUnique({
      where: { id: idParsed.data },
      select: { id: true, athleteId: true, deletedAt: true },
    })
    if (!existing) return { ok: false, error: "Tessera non trovata" }
    if (existing.deletedAt) return { ok: true } // idempotente

    await prisma.affiliation.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "CARD_DELETE",
        entityType: "Affiliation",
        entityId: existing.id,
        changes: { athleteId: existing.athleteId },
      },
    })

    revalidateCards(existing.athleteId)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

// URL firmato fresco: quello salvato in DB scade dopo 24h.
export async function refreshCardSignedUrl(
  cardId: string,
): Promise<ActionResult<{ signedUrl: string }>> {
  await requireAdmin()

  const idParsed = uuidSchema.safeParse(cardId)
  if (!idParsed.success) return { ok: false, error: "Identificativo non valido" }

  const card = await prisma.affiliation.findUnique({
    where: { id: idParsed.data },
    select: { id: true, filePath: true, deletedAt: true },
  })
  if (!card || card.deletedAt) return { ok: false, error: "Tessera non trovata" }
  if (!card.filePath) return { ok: false, error: "Nessun PDF allegato" }

  const url = await getAffiliationCardSignedUrl(card.filePath)
  if (!url) return { ok: false, error: "Impossibile generare il link" }

  await prisma.affiliation.update({
    where: { id: card.id },
    data: { fileUrl: url },
  })

  return { ok: true, data: { signedUrl: url } }
}
