"use server"

import { revalidatePath } from "next/cache"

import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"
import type { ActionResult } from "@/lib/schemas/common"
import { uuidSchema } from "@/lib/schemas/common"
import {
  medicalCertSchema,
  type MedicalCertValues,
} from "@/lib/schemas/medical-certificate"
import {
  ALLOWED_MIME,
  deleteMedicalCertFile,
  getMedicalCertSignedUrl as getSignedFromStorage,
  uploadMedicalCertFile,
} from "@/lib/supabase/storage-medical-cert"
import { validateFileSignature } from "@/lib/utils/file-signature"

const MAX_BYTES = 3 * 1024 * 1024

function mapPrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2003") return "Allieva non trovata"
    if (error.code === "P2025") return "Certificato non trovato"
  }
  console.error("[medical-cert action] error", error)
  return "Errore interno, riprova"
}

function revalidateAthlete(athleteId: string) {
  revalidatePath(`/admin/athletes/${athleteId}`)
}

function parseValues(formData: FormData): MedicalCertValues | { error: string } {
  const type = formData.get("type")
  const issueDate = formData.get("issueDate")
  const expiryDate = formData.get("expiryDate")
  const doctorName = formData.get("doctorName")
  const notes = formData.get("notes")

  const candidate = {
    type: typeof type === "string" ? type : "",
    issueDate:
      typeof issueDate === "string" && issueDate
        ? new Date(issueDate)
        : undefined,
    expiryDate:
      typeof expiryDate === "string" && expiryDate
        ? new Date(expiryDate)
        : undefined,
    doctorName: typeof doctorName === "string" ? doctorName : "",
    notes: typeof notes === "string" ? notes : "",
  }

  const parsed = medicalCertSchema.safeParse(candidate)
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
  if (file.size > MAX_BYTES) return "File troppo grande (max 3 MB)"
  if (!(ALLOWED_MIME as readonly string[]).includes(file.type)) {
    return `Formato non supportato (${file.type}). Ammessi: PDF, JPEG, PNG.`
  }
  return validateFileSignature(file, ALLOWED_MIME)
}

export async function createMedicalCertificate(
  athleteId: string,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(athleteId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo allieva non valido" }
  }

  const parsed = parseValues(formData)
  if ("error" in parsed) return { ok: false, error: parsed.error }

  const file = fileFromForm(formData)
  if (file) {
    const fileError = await validateFile(file)
    if (fileError) return { ok: false, error: fileError }
  }

  try {
    const cert = await prisma.medicalCertificate.create({
      data: {
        athleteId: idParsed.data,
        type: parsed.type,
        issueDate: parsed.issueDate,
        expiryDate: parsed.expiryDate,
        doctorName:
          parsed.doctorName && parsed.doctorName !== ""
            ? parsed.doctorName
            : null,
        notes: parsed.notes && parsed.notes !== "" ? parsed.notes : null,
      },
      select: { id: true },
    })

    if (file) {
      try {
        const uploaded = await uploadMedicalCertFile(
          idParsed.data,
          cert.id,
          file,
        )
        await prisma.medicalCertificate.update({
          where: { id: cert.id },
          data: { filePath: uploaded.filePath, fileUrl: uploaded.signedUrl },
        })
      } catch (uploadError) {
        // Rollback DB record se upload fallisce
        await prisma.medicalCertificate.delete({ where: { id: cert.id } })
        const message =
          uploadError instanceof Error
            ? uploadError.message
            : "Upload fallito"
        return { ok: false, error: message }
      }
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: "CERT_CREATE",
        entityType: "MedicalCertificate",
        entityId: cert.id,
        changes: {
          athleteId: idParsed.data,
          type: parsed.type,
          fileUploaded: !!file,
        },
      },
    })

    revalidateAthlete(idParsed.data)
    return { ok: true, data: { id: cert.id } }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function updateMedicalCertificate(
  certId: string,
  formData: FormData,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(certId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo certificato non valido" }
  }

  const parsed = parseValues(formData)
  if ("error" in parsed) return { ok: false, error: parsed.error }

  const file = fileFromForm(formData)
  if (file) {
    const fileError = await validateFile(file)
    if (fileError) return { ok: false, error: fileError }
  }

  try {
    const existing = await prisma.medicalCertificate.findUnique({
      where: { id: idParsed.data },
      select: { id: true, athleteId: true, filePath: true, deletedAt: true },
    })
    if (!existing || existing.deletedAt) {
      return { ok: false, error: "Certificato non trovato" }
    }

    let filePath = existing.filePath
    let fileUrl: string | null | undefined = undefined
    if (file) {
      // Cancella vecchio file se presente, prima di upload nuovo (rotation)
      if (existing.filePath) {
        await deleteMedicalCertFile(existing.filePath)
      }
      const uploaded = await uploadMedicalCertFile(
        existing.athleteId,
        existing.id,
        file,
      )
      filePath = uploaded.filePath
      fileUrl = uploaded.signedUrl
    }

    await prisma.medicalCertificate.update({
      where: { id: existing.id },
      data: {
        type: parsed.type,
        issueDate: parsed.issueDate,
        expiryDate: parsed.expiryDate,
        doctorName:
          parsed.doctorName && parsed.doctorName !== ""
            ? parsed.doctorName
            : null,
        notes: parsed.notes && parsed.notes !== "" ? parsed.notes : null,
        ...(file ? { filePath, fileUrl } : {}),
      },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "CERT_UPDATE",
        entityType: "MedicalCertificate",
        entityId: existing.id,
        changes: {
          type: parsed.type,
          fileReplaced: !!file,
        },
      },
    })

    revalidateAthlete(existing.athleteId)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

export async function softDeleteMedicalCertificate(
  certId: string,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const idParsed = uuidSchema.safeParse(certId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo certificato non valido" }
  }

  try {
    const existing = await prisma.medicalCertificate.findUnique({
      where: { id: idParsed.data },
      select: { id: true, athleteId: true, deletedAt: true },
    })
    if (!existing) {
      return { ok: false, error: "Certificato non trovato" }
    }
    if (existing.deletedAt) {
      return { ok: true } // idempotente
    }

    await prisma.medicalCertificate.update({
      where: { id: existing.id },
      data: { deletedAt: new Date() },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: "CERT_DELETE",
        entityType: "MedicalCertificate",
        entityId: existing.id,
      },
    })

    revalidateAthlete(existing.athleteId)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mapPrismaError(error) }
  }
}

// Refresh signed URL on demand. Usato dal bottone "Scarica certificato"
// quando il URL salvato in DB è scaduto (TTL 24h).
export async function refreshMedicalCertSignedUrl(
  certId: string,
): Promise<ActionResult<{ signedUrl: string }>> {
  await requireAdmin()

  const idParsed = uuidSchema.safeParse(certId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo non valido" }
  }

  const cert = await prisma.medicalCertificate.findUnique({
    where: { id: idParsed.data },
    select: { id: true, filePath: true, deletedAt: true },
  })
  if (!cert || cert.deletedAt) {
    return { ok: false, error: "Certificato non trovato" }
  }
  if (!cert.filePath) {
    return { ok: false, error: "Nessun file allegato" }
  }

  const url = await getSignedFromStorage(cert.filePath)
  if (!url) {
    return { ok: false, error: "Impossibile generare URL firmato" }
  }

  // Aggiorna anche il fileUrl in DB per coerenza letture successive
  await prisma.medicalCertificate.update({
    where: { id: cert.id },
    data: { fileUrl: url },
  })

  return { ok: true, data: { signedUrl: url } }
}
