import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer"

// I campi anagrafici che servono a tesserare. Sesso e contatto ci sono solo
// nell'elenco dell'admin: il referente tessere li riceve senza (variant
// "card-manager"), perché non gli servono e non deve vederli.
export type AffiliationExportRow = {
  id: string
  lastName: string
  firstName: string
  dateOfBirth: Date
  placeOfBirth: string | null
  provinceOfBirth: string | null
  fiscalCode: string | null
  residenceStreet: string | null
  residenceNumber: string | null
  residenceCity: string | null
  residenceProvince: string | null
  residenceCap: string | null
  missing: string[]
  gender?: "F" | "M" | "OTHER"
  contactEmail?: string | null
  contactPhone?: string | null
}

export type AffiliationExportVariant = "admin" | "card-manager"

import { pdfColors, pdfStyles } from "../styles"
import { IADHeaderMark } from "./iad-header"

// Elenco iscritte da tesserare, da mandare al referente dell'ente: ENDAS e
// CSEN non hanno API, il tesseramento lo fa una persona a mano sul portale.
// Il foglio deve contenere tutto quello che le serve per digitarlo, e dire a
// colpo d'occhio dove l'anagrafica è incompleta.

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 44,
    paddingHorizontal: 24,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: pdfColors.text,
  },
  intro: {
    fontSize: 9,
    color: pdfColors.muted,
    marginBottom: 10,
  },
  th: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.muted,
    textTransform: "uppercase",
  },
  td: {
    fontSize: 7.5,
    color: pdfColors.text,
  },
  tdMono: {
    fontSize: 7.5,
    fontFamily: "Courier",
    color: pdfColors.text,
  },
  tdMissing: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.danger,
  },
  warning: {
    marginTop: 12,
    padding: 6,
    borderWidth: 0.5,
    borderColor: pdfColors.danger,
    borderRadius: 2,
    fontSize: 8,
    color: pdfColors.danger,
  },
})

type ColumnKey =
  | "n"
  | "lastName"
  | "firstName"
  | "gender"
  | "birth"
  | "birthPlace"
  | "fiscalCode"
  | "residence"
  | "contact"

const COLUMNS: Record<AffiliationExportVariant, { key: ColumnKey; label: string; width: string }[]> = {
  admin: [
    { key: "n", label: "#", width: "3%" },
    { key: "lastName", label: "Cognome", width: "11%" },
    { key: "firstName", label: "Nome", width: "10%" },
    { key: "gender", label: "Sesso", width: "4%" },
    { key: "birth", label: "Nato/a il", width: "8%" },
    { key: "birthPlace", label: "Luogo di nascita", width: "13%" },
    { key: "fiscalCode", label: "Codice fiscale", width: "14%" },
    { key: "residence", label: "Residenza", width: "22%" },
    { key: "contact", label: "Contatto", width: "15%" },
  ],
  "card-manager": [
    { key: "n", label: "#", width: "3%" },
    { key: "lastName", label: "Cognome", width: "13%" },
    { key: "firstName", label: "Nome", width: "12%" },
    { key: "birth", label: "Nato/a il", width: "9%" },
    { key: "birthPlace", label: "Luogo di nascita", width: "16%" },
    { key: "fiscalCode", label: "Codice fiscale", width: "16%" },
    { key: "residence", label: "Residenza", width: "31%" },
  ],
}

function formatDateIt(date: Date): string {
  const d = new Date(date)
  const dd = String(d.getUTCDate()).padStart(2, "0")
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  return `${dd}/${mm}/${d.getUTCFullYear()}`
}

function genderLetter(g: "F" | "M" | "OTHER" | undefined): string {
  return !g || g === "OTHER" ? "—" : g
}

function birthPlace(row: AffiliationExportRow): string {
  if (!row.placeOfBirth) return ""
  return row.provinceOfBirth
    ? `${row.placeOfBirth} (${row.provinceOfBirth})`
    : row.placeOfBirth
}

function residence(row: AffiliationExportRow): string {
  const street = [row.residenceStreet, row.residenceNumber]
    .filter(Boolean)
    .join(" ")
  const city = [row.residenceCap, row.residenceCity].filter(Boolean).join(" ")
  const prov = row.residenceProvince ? `(${row.residenceProvince})` : ""
  return [street, [city, prov].filter(Boolean).join(" ")]
    .filter((part) => part.length > 0)
    .join(", ")
}

function contact(row: AffiliationExportRow): string {
  return [row.contactEmail, row.contactPhone].filter(Boolean).join(" · ")
}

function Cell({
  width,
  value,
  mono = false,
}: {
  width: string
  value: string
  mono?: boolean
}) {
  const empty = value.trim().length === 0
  return (
    <View style={{ width }}>
      <Text style={empty ? styles.tdMissing : mono ? styles.tdMono : styles.td}>
        {empty ? "DA COMPLETARE" : value}
      </Text>
    </View>
  )
}

function ExportCell({
  column,
  width,
  row,
  n,
}: {
  column: ColumnKey
  width: string
  row: AffiliationExportRow
  n: number
}) {
  switch (column) {
    case "n":
      return (
        <View style={{ width }}>
          <Text style={styles.td}>{n}</Text>
        </View>
      )
    case "gender":
      return (
        <View style={{ width }}>
          <Text style={styles.td}>{genderLetter(row.gender)}</Text>
        </View>
      )
    case "birth":
      return (
        <View style={{ width }}>
          <Text style={styles.td}>{formatDateIt(row.dateOfBirth)}</Text>
        </View>
      )
    case "lastName":
      return <Cell width={width} value={row.lastName} />
    case "firstName":
      return <Cell width={width} value={row.firstName} />
    case "birthPlace":
      return <Cell width={width} value={birthPlace(row)} />
    case "fiscalCode":
      return <Cell width={width} value={row.fiscalCode ?? ""} mono />
    case "residence":
      return <Cell width={width} value={residence(row)} />
    case "contact":
      return <Cell width={width} value={contact(row)} />
  }
}

export type AffiliationExportProps = {
  rows: AffiliationExportRow[]
  variant?: AffiliationExportVariant
  entity: string
  seasonYear: number
  asdName: string | null
  logoUrl?: string | null
  generatedAt?: Date
}

export function AffiliationExportPDF({
  rows,
  entity,
  seasonYear,
  asdName,
  logoUrl,
  variant = "admin",
  generatedAt = new Date(),
}: AffiliationExportProps) {
  const columns = COLUMNS[variant]
  const incomplete = rows.filter((r) => r.missing.length > 0)

  return (
    <Document
      title={`Elenco da tesserare ${entity} ${seasonYear}`}
      author={asdName ?? "IAD Irpinia Arte Danza"}
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={pdfStyles.headerRow}>
          <IADHeaderMark logoUrl={logoUrl} />
          <View>
            <Text style={pdfStyles.documentTitle}>
              Elenco da tesserare {entity} — Anno sociale {seasonYear}
            </Text>
            <Text style={pdfStyles.documentMeta}>
              {asdName ?? "A.S.D. IAD Irpinia Arte Danza"}
            </Text>
            <Text style={pdfStyles.documentMeta}>
              {rows.length} {rows.length === 1 ? "persona" : "persone"} ·
              generato il {formatDateIt(generatedAt)}
            </Text>
          </View>
        </View>
        <View style={pdfStyles.headerDivider} />

        <Text style={styles.intro}>
          Iscritte che per l&apos;anno sociale {seasonYear} non risultano ancora
          tesserate {entity}.
        </Text>

        {rows.length === 0 ? (
          <Text style={pdfStyles.emptyState}>
            Nessuna iscritta da tesserare: per l&apos;anno sociale {seasonYear}
            {" "}
            hanno già tutte la tessera.
          </Text>
        ) : (
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableHeader} fixed>
              {columns.map((c) => (
                <View key={c.key} style={{ width: c.width }}>
                  <Text style={styles.th}>{c.label}</Text>
                </View>
              ))}
            </View>
            {rows.map((row, i) => (
              <View
                key={row.id}
                style={
                  i === rows.length - 1
                    ? pdfStyles.tableRowLast
                    : pdfStyles.tableRow
                }
                wrap={false}
              >
                {columns.map((c) => (
                  <ExportCell key={c.key} column={c.key} width={c.width} row={row} n={i + 1} />
                ))}
              </View>
            ))}
          </View>
        )}

        {incomplete.length > 0 ? (
          <View style={styles.warning}>
            <Text>
              {incomplete.length}{" "}
              {incomplete.length === 1
                ? "iscritta ha dati incompleti"
                : "iscritte hanno dati incompleti"}
              : le caselle segnate &quot;DA COMPLETARE&quot; vanno riempite in
              anagrafica prima di mandare l&apos;elenco.
            </Text>
          </View>
        ) : null}

        <View style={pdfStyles.footer} fixed>
          <Text style={pdfStyles.footerLeft}>
            Documento generato dal gestionale {asdName ?? "IAD"} — contiene dati
            personali, anche di minori: trattare secondo il GDPR.
          </Text>
          <Text
            style={pdfStyles.footerRight}
            render={({ pageNumber, totalPages }) =>
              `Pag. ${pageNumber}/${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  )
}
