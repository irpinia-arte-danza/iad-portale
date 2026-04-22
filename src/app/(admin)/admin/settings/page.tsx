import { requireAdmin } from "@/lib/auth/require-admin"
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

export default async function SettingsPage() {
  const { userId } = await requireAdmin()

  const [brand, receipt, profile, admins, auditRows, reminder, reminderPreview] =
    await Promise.all([
      getBrandSettings(),
      getReceiptSettings(),
      getUserProfile(userId),
      getAdminUsers(),
      getSettingsAuditLog(50),
      getReminderConfig(),
      previewCronReminders(),
    ])

  const initialAssociation: AssociationValues = {
    asdName: brand.asdName,
    asdFiscalCode: brand.asdFiscalCode,
    asdVatNumber: brand.asdVatNumber ?? "",
    asdEmail: brand.asdEmail,
    asdPec: brand.asdPec ?? "",
    asdPhone: brand.asdPhone ?? "",
    asdWebsite: brand.asdWebsite ?? "",
    asdIban: brand.asdIban ?? "",
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
    receiptFooter: receipt.receiptFooter ?? "",
  }

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
          initialAssociation={initialAssociation}
          initialBrand={initialBrand}
          initialRicevute={initialRicevute}
          initialReminder={reminder}
          initialReminderPreview={reminderPreview}
          initialProfile={initialProfile}
          admins={admins}
          auditRows={auditRows}
        />
      </ResourceContent>
    </>
  )
}
