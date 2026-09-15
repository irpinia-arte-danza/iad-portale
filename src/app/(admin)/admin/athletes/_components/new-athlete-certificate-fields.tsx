"use client"

import * as React from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  MEDICAL_CERT_FILE_ACCEPT,
  medicalCertFileError,
} from "@/lib/medical-certificates/file-rules"
import {
  suggestedExpiryDate,
  type NewAthleteCertificate,
} from "@/lib/medical-certificates/new-athlete-certificate"
import {
  MEDICAL_CERT_TYPE_LABELS,
  MEDICAL_CERT_TYPES,
  type MedicalCertType,
} from "@/lib/schemas/medical-certificate"

type Props = {
  value: NewAthleteCertificate
  onChange: (value: NewAthleteCertificate) => void
  error: string | null
  disabled?: boolean
}

export function NewAthleteCertificateFields({
  value,
  onChange,
  error,
  disabled,
}: Props) {
  const [fileError, setFileError] = React.useState<string | null>(null)
  const id = React.useId()

  function onIssueDateChange(issueDate: string) {
    // Come nel dialog della scheda: scadenza proposta a un anno se manca
    // o precede la nuova emissione
    const expiryDate =
      issueDate && (!value.expiryDate || value.expiryDate <= issueDate)
        ? suggestedExpiryDate(issueDate)
        : value.expiryDate
    onChange({ ...value, issueDate, expiryDate })
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setFileError(null)
    if (file) {
      const problem = medicalCertFileError(file)
      if (problem) {
        setFileError(problem)
        e.target.value = ""
        onChange({ ...value, file: null })
        return
      }
    }
    onChange({ ...value, file })
  }

  return (
    <fieldset className="space-y-4" disabled={disabled}>
      <legend className="text-sm font-medium">
        Certificato medico (facoltativo)
      </legend>
      <p className="-mt-2 text-xs text-muted-foreground">
        Se lo inserisci servono data di emissione e scadenza. Se lo lasci
        vuoto potrai caricarlo dalla scheda dell&apos;allieva.
      </p>
      <div className="space-y-2">
        <Label htmlFor={`${id}-type`}>Tipo</Label>
        <Select
          value={value.type}
          onValueChange={(type) =>
            onChange({ ...value, type: type as MedicalCertType })
          }
        >
          <SelectTrigger id={`${id}-type`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MEDICAL_CERT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {MEDICAL_CERT_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`${id}-issue`}>Emesso il</Label>
          <Input
            id={`${id}-issue`}
            type="date"
            value={value.issueDate}
            onChange={(e) => onIssueDateChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-expiry`}>Scade il</Label>
          <Input
            id={`${id}-expiry`}
            type="date"
            value={value.expiryDate}
            onChange={(e) => onChange({ ...value, expiryDate: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-file`}>File (PDF, JPEG, PNG, max 3 MB)</Label>
        <Input
          id={`${id}-file`}
          type="file"
          accept={MEDICAL_CERT_FILE_ACCEPT}
          onChange={onFileChange}
        />
        {fileError ? (
          <p className="text-xs text-destructive">{fileError}</p>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </fieldset>
  )
}
