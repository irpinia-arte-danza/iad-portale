import {
  currentDeviceId,
  listAdminLogins,
  listKnownDevices,
  previousSuccessfulLogin,
} from "@/lib/auth/admin-logins"
import { adminHasVerifiedFactor, getSessionLevel } from "@/lib/auth/mfa"
import { countUnusedRecoveryCodes } from "@/lib/auth/recovery-codes"
import { requireAdmin } from "@/lib/auth/require-admin"
import { loadNumberingPreviewContext } from "@/lib/receipts/numbering-context"
import type {
  AssociationValues,
  BrandValues,
  ProfileValues,
  RicevuteValues,
} from "@/lib/schemas/admin-settings"

import { ResourceContent } from "../_components/resource-content"
import { ResourceHeader } from "../_components/resource-header"

import { SettingsShell } from "./_components/settings-shell"
import {
  getAdminUsers,
  getBrandSettings,
  getReceiptSettings,
  getSettingsAuditLog,
  getUserProfile,
} from "./queries"
import {
  getReminderConfig,
  previewCronReminders,
} from "./reminder-actions"

type PageProps = { searchParams: Promise<{ tab?: string }> }

export default async function SettingsPage({ searchParams }: PageProps) {
  const { userId } = await requireAdmin()
  const { tab } = await searchParams

  const level = await getSessionLevel()
  const [
    brand,
    receipt,
    profile,
    adminUsers,
    auditRows,
    reminder,
    reminderPreview,
    logins,
    devices,
    deviceId,
    previousLogin,
  ] = await Promise.all([
    getBrandSettings(),
    getReceiptSettings(),
    getUserProfile(userId),
    getAdminUsers(),
    getSettingsAuditLog(50),
    getReminderConfig(),
    previewCronReminders(),
    // Accessi: i propri, degli ultimi 90 giorni, e i propri dispositivi
    listAdminLogins(userId),
    listKnownDevices(userId),
    currentDeviceId(),
    previousSuccessfulLogin(userId, level.sessionId),
  ])

  // Il secondo fattore vive in Supabase Auth: una chiamata per admin (sono due)
  const admins = await Promise.all(
    adminUsers.map(async (a) => ({
      ...a,
      hasSecondFactor: await adminHasVerifiedFactor(a.id),
      recoveryCodesLeft: await countUnusedRecoveryCodes(a.id),
    })),
  )

  const initialAssociation: AssociationValues = {
    asdName: brand.asdName,
    asdFiscalCode: brand.asdFiscalCode,
    asdVatNumber: brand.asdVatNumber ?? "",
    asdEmail: brand.asdEmail,
    asdPec: brand.asdPec ?? "",
    asdPhone: brand.asdPhone ?? "",
    asdWebsite: brand.asdWebsite ?? "",
    asdIban: brand.asdIban ?? "",
    bankAccountHolder: brand.bankAccountHolder ?? "",
    asdSdiCode: brand.asdSdiCode ?? "",
    addressStreet: brand.addressStreet ?? "",
    addressZip: brand.addressZip ?? "",
    addressCity: brand.addressCity ?? "",
    addressProvince: brand.addressProvince ?? "",
    gymSameAsLegal: brand.gymSameAsLegal,
    gymAddress: brand.gymAddress ?? "",
  }

  const initialBrand: {
    colors: BrandValues
    logos: {
      logoUrl: string | null
      logoDarkUrl: string | null
      logoSvgUrl: string | null
      faviconUrl: string | null
    }
  } = {
    colors: {
      primaryColor: brand.primaryColor,
      secondaryColor: brand.secondaryColor,
    },
    logos: {
      logoUrl: brand.logoUrl,
      logoDarkUrl: brand.logoDarkUrl,
      logoSvgUrl: brand.logoSvgUrl,
      faviconUrl: brand.faviconUrl,
    },
  }

  const initialRicevute: RicevuteValues = {
    receiptPrefix: receipt.receiptPrefix,
    receiptNumber: receipt.receiptNumber,
    receiptYearMode: receipt.receiptYearMode,
    receiptResetMode: receipt.receiptResetMode,
    receiptDigits: receipt.receiptDigits,
    receiptFooter: receipt.receiptFooter ?? "",
  }

  // Serve all'anteprima dal vivo: il browser ricalcola il prossimo numero a
  // ogni cambio di opzione senza tornare al server
  const receiptPreview = await loadNumberingPreviewContext(
    receipt.receiptPrefix,
    receipt.receiptPeriod,
  )

  const initialProfile: ProfileValues = {
    firstName: profile.firstName ?? "",
    lastName: profile.lastName ?? "",
    email: profile.email,
    phone: profile.phone ?? "",
    themePreference: (profile.themePreference ?? "system") as
      | "light"
      | "dark"
      | "system",
    localePreference: (profile.localePreference ?? "it") as "it" | "en",
  }

  return (
    <>
      <ResourceHeader
        breadcrumbs={[{ label: "Impostazioni" }]}
        title="Impostazioni"
        description="Dati associazione, brand, numerazione ricevute, account e amministratori."
      />
      <ResourceContent>
        <SettingsShell
          currentUserId={userId}
          initialTab={tab}
          initialAssociation={initialAssociation}
          initialBrand={initialBrand}
          initialRicevute={initialRicevute}
          receiptPreview={receiptPreview}
          initialReminder={reminder}
          initialReminderPreview={reminderPreview}
          initialProfile={initialProfile}
          admins={admins}
          auditRows={auditRows}
          access={{ logins, devices, currentDeviceId: deviceId, previousLogin }}
        />
      </ResourceContent>
    </>
  )
}
