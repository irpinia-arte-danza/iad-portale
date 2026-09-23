import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer"

import type { TesseramentoRow } from "@/app/(admin)/admin/tessere/queries"

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

const COLUMNS = [
  { key: "n", label: "#", width: "3%" },
  { key: "lastName", label: "Cognome", width: "11%" },
  { key: "firstName", label: "Nome", width: "10%" },
  { key: "gender", label: "Sesso", width: "4%" },
  { key: "birth", label: "Nato/a il", width: "8%" },
  { key: "birthPlace", label: "Luogo di nascita", width: "13%" },
  { key: "fiscalCode", label: "Codice fiscale", width: "14%" },
  { key: "residence", label: "Residenza", width: "22%" },
  { key: "contact", label: "Contatto", width: "15%" },
] as const

function formatDateIt(date: Date): string {
  const d = new Date(date)
  const dd = String(d.getUTCDate()).padStart(2, "0")
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  return `${dd}/${mm}/${d.getUTCFullYear()}`
}

function genderLetter(g: "F" | "M" | "OTHER"): string {
  return g === "OTHER" ? "—" : g
}

function birthPlace(row: TesseramentoRow): string {
  if (!row.placeOfBirth) return ""
  return row.provinceOfBirth
    ? `${row.placeOfBirth} (${row.provinceOfBirth})`
    : row.placeOfBirth
}

function residence(row: TesseramentoRow): string {
  const street = [row.residenceStreet, row.residenceNumber]
    .filter(Boolean)
    .join(" ")
  const city = [row.residenceCap, row.residenceCity].filter(Boolean).join(" ")
  const prov = row.residenceProvince ? `(${row.residenceProvince})` : ""
  return [street, [city, prov].filter(Boolean).join(" ")]
    .filter((part) => part.length > 0)
    .join(", ")
}

function contact(row: TesseramentoRow): string {
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

export type AffiliationExportProps = {
  rows: TesseramentoRow[]
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
  generatedAt = new Date(),
}: AffiliationExportProps) {
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
              {COLUMNS.map((c) => (
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
                <View style={{ width: COLUMNS[0].width }}>
                  <Text style={styles.td}>{i + 1}</Text>
                </View>
                <Cell width={COLUMNS[1].width} value={row.lastName} />
                <Cell width={COLUMNS[2].width} value={row.firstName} />
                <View style={{ width: COLUMNS[3].width }}>
                  <Text style={styles.td}>{genderLetter(row.gender)}</Text>
                </View>
                <View style={{ width: COLUMNS[4].width }}>
                  <Text style={styles.td}>{formatDateIt(row.dateOfBirth)}</Text>
                </View>
                <Cell width={COLUMNS[5].width} value={birthPlace(row)} />
                <Cell
                  width={COLUMNS[6].width}
                  value={row.fiscalCode ?? ""}
                  mono
                />
                <Cell width={COLUMNS[7].width} value={residence(row)} />
                <Cell width={COLUMNS[8].width} value={contact(row)} />
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
