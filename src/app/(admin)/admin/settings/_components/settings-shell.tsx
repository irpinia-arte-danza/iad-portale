"use client"

import { useCallback, useState } from "react"

import type {
  AssociationValues,
  BrandValues,
  ProfileValues,
  RicevuteValues,
} from "@/lib/schemas/admin-settings"

import type { AuditLogRow } from "../queries"

import { AccountTab } from "./account-tab"
import { AdminTab } from "./admin-tab"
import { AssociationTab } from "./association-tab"
import { BrandTab } from "./brand-tab"
import { DirtyGuardDialog } from "./dirty-guard-dialog"
import { RicevuteTab } from "./ricevute-tab"
import {
  SettingsNav,
  type SettingsTabKey,
} from "./settings-nav"

interface SettingsShellProps {
  currentUserId: string
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
  initialProfile: ProfileValues
  admins: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    isActive: boolean
    createdAt: Date
  }[]
  auditRows: AuditLogRow[]
}

export function SettingsShell(props: SettingsShellProps) {
  const [active, setActive] = useState<SettingsTabKey>("associazione")
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
