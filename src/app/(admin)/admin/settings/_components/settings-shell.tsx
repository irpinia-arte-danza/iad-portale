"use client"

import { useCallback, useState } from "react"

import type {
  AssociationValues,
  BrandValues,
  ProfileValues,
  RicevuteValues,
} from "@/lib/schemas/admin-settings"
import type { AdminLoginRow, KnownDevice, PreviousLogin } from "@/lib/auth/admin-logins"
import type { NumberingPreviewContext } from "@/lib/receipts/numbering-context"
import type { ReminderConfigValues } from "@/lib/schemas/reminder-config"

import type { AuditLogRow } from "../queries"
import type { CronPreview } from "../reminder-actions"

import { AccessTab } from "./access-tab"
import { AccountTab } from "./account-tab"
import { AdminTab } from "./admin-tab"
import { AssociationTab } from "./association-tab"
import { BrandTab } from "./brand-tab"
import { DirtyGuardDialog } from "./dirty-guard-dialog"
import { ReminderTab } from "./reminder-tab"
import { RicevuteTab } from "./ricevute-tab"
import {
  SETTINGS_TABS,
  SettingsNav,
  type SettingsTabKey,
} from "./settings-nav"

interface SettingsShellProps {
  currentUserId: string
  // Da ?tab=…; non valida → la prima scheda
  initialTab?: string
  initialAssociation: AssociationValues
  initialBrand: {
    colors: BrandValues
    logos: {
      logoUrl: string | null
      logoDarkUrl: string | null
      logoSvgUrl: string | null
      faviconUrl: string | null
    }
  }
  initialRicevute: RicevuteValues
  receiptPreview: NumberingPreviewContext
  initialReminder: ReminderConfigValues
  initialReminderPreview: CronPreview
  initialProfile: ProfileValues
  admins: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    isActive: boolean
    createdAt: Date
    hasSecondFactor: boolean
    recoveryCodesLeft: number
  }[]
  auditRows: AuditLogRow[]
  access: {
    logins: AdminLoginRow[]
    devices: KnownDevice[]
    currentDeviceId: string | null
    previousLogin: PreviousLogin | null
  }
}

export function SettingsShell(props: SettingsShellProps) {
  const [active, setActive] = useState<SettingsTabKey>(
    SETTINGS_TABS.some((t) => t.key === props.initialTab)
      ? (props.initialTab as SettingsTabKey)
      : "associazione",
  )
  const [dirty, setDirty] = useState(false)
  const [pendingTab, setPendingTab] = useState<SettingsTabKey | null>(null)

  const onDirtyChange = useCallback((d: boolean) => setDirty(d), [])

  function onNavChange(next: SettingsTabKey) {
    if (next === active) return
    if (dirty) {
      setPendingTab(next)
      return
    }
    setActive(next)
  }

  function onConfirmDiscard() {
    if (pendingTab) {
      setDirty(false)
      setActive(pendingTab)
      setPendingTab(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SettingsNav active={active} onChange={onNavChange} />

      <div className="min-h-[50vh]">
        {active === "account" ? (
          <AccountTab
            key="account"
            initial={props.initialProfile}
            onDirtyChange={onDirtyChange}
          />
        ) : null}

        {active === "associazione" ? (
          <AssociationTab
            key="associazione"
            initial={props.initialAssociation}
            onDirtyChange={onDirtyChange}
          />
        ) : null}

        {active === "accessi" ? <AccessTab key="accessi" {...props.access} /> : null}

        {active === "brand" ? (
          <BrandTab
            key="brand"
            initialColors={props.initialBrand.colors}
            initialLogos={props.initialBrand.logos}
            onDirtyChange={onDirtyChange}
          />
        ) : null}

        {active === "ricevute" ? (
          <RicevuteTab
            key="ricevute"
            initial={props.initialRicevute}
            preview={props.receiptPreview}
            onDirtyChange={onDirtyChange}
          />
        ) : null}

        {active === "reminder" ? (
          <ReminderTab
            key="reminder"
            initial={props.initialReminder}
            initialPreview={props.initialReminderPreview}
            onDirtyChange={onDirtyChange}
          />
        ) : null}

        {active === "admin" ? (
          <AdminTab
            key="admin"
            currentUserId={props.currentUserId}
            admins={props.admins}
            auditRows={props.auditRows}
          />
        ) : null}
      </div>

      <DirtyGuardDialog
        open={pendingTab !== null}
        onOpenChange={(o) => {
          if (!o) setPendingTab(null)
        }}
        onConfirm={onConfirmDiscard}
      />
    </div>
  )
}
