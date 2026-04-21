"use server"

import { revalidatePath } from "next/cache"

import { Prisma } from "@prisma/client"

import { requireAdmin } from "@/lib/auth/require-admin"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin-client"
import {
  uploadBrandAsset,
  deleteBrandAssetByUrl,
  type BrandLogoSlot,
} from "@/lib/supabase/storage-brand"
import type { ActionResult } from "@/lib/schemas/common"
import {
  adminInviteSchema,
  associationSchema,
  brandSchema,
  changePasswordSchema,
  profileSchema,
  ricevuteSchema,
  type AdminInviteValues,
  type AssociationValues,
  type BrandValues,
  type ChangePasswordValues,
  type ProfileValues,
  type RicevuteValues,
} from "@/lib/schemas/admin-settings"
import { normalizeIban } from "@/lib/schemas/fiscal-validators"

import { diffChanges, logSettingsChange } from "./audit-helpers"

const SETTINGS_PATH = "/admin/settings"

function cleanEmpty<T extends Record<string, unknown>>(data: T): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    out[k] = typeof v === "string" && v === "" ? null : v
  }
  return out as T
}

// ============================================================================
// Associazione
// ============================================================================
export async function updateAssociation(
  values: AssociationValues,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const parsed = associationSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  try {
    const before = await prisma.brandSettings.findUniqueOrThrow({
      where: { id: 1 },
    })

    // asdAddress legacy: compose da parti decomposte, null se tutte vuote
    const addressParts = [
      parsed.data.addressStreet,
      parsed.data.addressZip,
      parsed.data.addressCity,
      parsed.data.addressProvince
        ? `(${parsed.data.addressProvince})`
        : null,
    ].filter((s): s is string => !!s && s.length > 0)

    const data: Prisma.BrandSettingsUpdateInput = cleanEmpty({
      ...parsed.data,
      asdIban: parsed.data.asdIban ? normalizeIban(parsed.data.asdIban) : "",
      asdAddress: addressParts.length > 0 ? addressParts.join(" - ") : null,
    })

    // gymAddress: null se stessa sede legale
    if (parsed.data.gymSameAsLegal) {
      data.gymAddress = null
    }

    await prisma.brandSettings.update({
      where: { id: 1 },
      data,
    })

    await logSettingsChange({
      userId,
      action: "UPDATE_ASSOCIATION",
      entityType: "BrandSettings",
      entityId: "1",
      changes: diffChanges(
        before as unknown as Record<string, unknown>,
        data as Record<string, unknown>,
      ),
    })

    revalidatePath(SETTINGS_PATH)
    return { ok: true }
  } catch (error) {
    console.error("[settings] updateAssociation failed", error)
    return { ok: false, error: "Errore aggiornamento dati associazione" }
  }
}

// ============================================================================
// Brand
// ============================================================================
export async function updateBrand(
  values: BrandValues,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const parsed = brandSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  try {
    const before = await prisma.brandSettings.findUniqueOrThrow({
      where: { id: 1 },
    })

    await prisma.brandSettings.update({
      where: { id: 1 },
      data: parsed.data,
    })

    await logSettingsChange({
      userId,
      action: "UPDATE_BRAND",
      entityType: "BrandSettings",
      entityId: "1",
      changes: diffChanges(
        before as unknown as Record<string, unknown>,
        parsed.data as Record<string, unknown>,
      ),
    })

    revalidatePath(SETTINGS_PATH)
    return { ok: true }
  } catch (error) {
    console.error("[settings] updateBrand failed", error)
    return { ok: false, error: "Errore aggiornamento brand" }
  }
}

const SLOT_COLUMN: Record<
  BrandLogoSlot,
  "logoUrl" | "logoDarkUrl" | "faviconUrl" | "logoSvgUrl"
> = {
  "logo-light": "logoUrl",
  "logo-dark": "logoDarkUrl",
  favicon: "faviconUrl",
  "logo-svg": "logoSvgUrl",
}

export async function uploadLogo(
  slot: BrandLogoSlot,
  formData: FormData,
): Promise<ActionResult<{ publicUrl: string }>> {
  const { userId } = await requireAdmin()

  const file = formData.get("file")
  if (!(file instanceof File)) {
    return { ok: false, error: "File mancante" }
  }

  try {
    const before = await prisma.brandSettings.findUniqueOrThrow({
      where: { id: 1 },
    })

    const column = SLOT_COLUMN[slot]
    const previousUrl = (before as unknown as Record<string, string | null>)[column]

    const { publicUrl } = await uploadBrandAsset(slot, file)

    await prisma.brandSettings.update({
      where: { id: 1 },
      data: { [column]: publicUrl },
    })

    if (previousUrl && previousUrl !== publicUrl) {
      await deleteBrandAssetByUrl(previousUrl)
    }

    await logSettingsChange({
      userId,
      action: "LOGO_UPLOAD",
      entityType: "BrandSettings",
      entityId: "1",
      changes: { slot, column, previousUrl, newUrl: publicUrl },
    })

    revalidatePath(SETTINGS_PATH)
    return { ok: true, data: { publicUrl } }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Errore upload logo"
    console.error("[settings] uploadLogo failed", { slot, error })
    return { ok: false, error: message }
  }
}

export async function deleteLogo(
  slot: BrandLogoSlot,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  try {
    const before = await prisma.brandSettings.findUniqueOrThrow({
      where: { id: 1 },
    })

    const column = SLOT_COLUMN[slot]
    const previousUrl = (before as unknown as Record<string, string | null>)[column]

    await prisma.brandSettings.update({
      where: { id: 1 },
      data: { [column]: null },
    })

    if (previousUrl) {
      await deleteBrandAssetByUrl(previousUrl)
    }

    await logSettingsChange({
      userId,
      action: "LOGO_DELETE",
      entityType: "BrandSettings",
      entityId: "1",
      changes: { slot, column, previousUrl },
    })

    revalidatePath(SETTINGS_PATH)
    return { ok: true }
  } catch (error) {
    console.error("[settings] deleteLogo failed", { slot, error })
    return { ok: false, error: "Errore eliminazione logo" }
  }
}

// ============================================================================
// Ricevute
// ============================================================================
export async function updateRicevute(
  values: RicevuteValues,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const parsed = ricevuteSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  try {
    const before = await prisma.receiptSettings.findUniqueOrThrow({
      where: { id: 1 },
    })

    const data = cleanEmpty(parsed.data)
    await prisma.receiptSettings.update({
      where: { id: 1 },
      data: { ...data, updatedBy: userId },
    })

    await logSettingsChange({
      userId,
      action: "UPDATE_RICEVUTE",
      entityType: "ReceiptSettings",
      entityId: "1",
      changes: diffChanges(
        before as unknown as Record<string, unknown>,
        data as Record<string, unknown>,
      ),
    })

    revalidatePath(SETTINGS_PATH)
    return { ok: true }
  } catch (error) {
    console.error("[settings] updateRicevute failed", error)
    return { ok: false, error: "Errore aggiornamento numerazione ricevute" }
  }
}

// ============================================================================
// Profile (account)
// ============================================================================
export async function updateProfile(
  values: ProfileValues,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const parsed = profileSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  try {
    const before = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        themePreference: true,
        localePreference: true,
      },
    })

    const data = cleanEmpty(parsed.data)
    await prisma.user.update({
      where: { id: userId },
      data,
    })

    // Se email cambiata, sync con Supabase Auth
    if (parsed.data.email !== before.email) {
      try {
        const admin = createAdminClient()
        await admin.auth.admin.updateUserById(userId, {
          email: parsed.data.email,
        })
      } catch (error) {
        console.warn("[settings] auth email sync failed", error)
      }
    }

    await logSettingsChange({
      userId,
      action: "UPDATE_PROFILE",
      entityType: "User",
      entityId: userId,
      changes: diffChanges(
        before as unknown as Record<string, unknown>,
        data as Record<string, unknown>,
      ),
    })

    revalidatePath(SETTINGS_PATH)
    return { ok: true }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, error: "Email già in uso" }
    }
    console.error("[settings] updateProfile failed", error)
    return { ok: false, error: "Errore aggiornamento profilo" }
  }
}

export async function changePassword(
  values: ChangePasswordValues,
): Promise<ActionResult> {
  const { userId } = await requireAdmin()

  const parsed = changePasswordSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Password non valida",
    }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.newPassword,
    })
    if (error) {
      return { ok: false, error: error.message }
    }

    await logSettingsChange({
      userId,
      action: "CHANGE_PASSWORD",
      entityType: "User",
      entityId: userId,
    })

    return { ok: true }
  } catch (error) {
    console.error("[settings] changePassword failed", error)
    return { ok: false, error: "Errore cambio password" }
  }
}

// ============================================================================
// Admin invite (magic link via Supabase service role)
// ============================================================================
export async function inviteAdmin(
  values: AdminInviteValues,
): Promise<ActionResult<{ email: string }>> {
  const { userId } = await requireAdmin()

  const parsed = adminInviteSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  const { email, firstName, lastName } = parsed.data
  const cleanFirst = (firstName ?? "").trim() || null
  const cleanLast = (lastName ?? "").trim() || null

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, deletedAt: true },
    })
    if (existing && existing.deletedAt === null && existing.role === "ADMIN") {
      return { ok: false, error: "Utente già amministratore" }
    }

    const admin = createAdminClient()
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/login`

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
    })
    if (error || !data?.user) {
      return { ok: false, error: error?.message ?? "Invite fallito" }
    }

    await prisma.user.upsert({
      where: { id: data.user.id },
      update: {
        email,
        role: "ADMIN",
        firstName: cleanFirst,
        lastName: cleanLast,
        isActive: true,
        deletedAt: null,
      },
      create: {
        id: data.user.id,
        email,
        role: "ADMIN",
        firstName: cleanFirst,
        lastName: cleanLast,
        isActive: true,
      },
    })

    await logSettingsChange({
      userId,
      action: "INVITE_ADMIN",
      entityType: "User",
      entityId: data.user.id,
      changes: { email, firstName: cleanFirst, lastName: cleanLast },
    })

    revalidatePath(SETTINGS_PATH)
    return { ok: true, data: { email } }
  } catch (error) {
    console.error("[settings] inviteAdmin failed", { email })
    const message =
      error instanceof Error ? error.message : "Errore invito admin"
    return { ok: false, error: message }
  }
}
