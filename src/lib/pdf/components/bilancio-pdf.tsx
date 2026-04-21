import { Document, Page, Text, View } from "@react-pdf/renderer"

import type {
  BilancioExpenseTypeEntry,
  BilancioFeeTypeEntry,
  BilancioResult,
} from "@/app/(admin)/admin/reports/bilancio/queries"
import { EXPENSE_TYPE_LABELS } from "@/lib/schemas/expense"
import { FEE_TYPE_LABELS } from "@/lib/schemas/payment"

import { pdfStyles } from "../styles"
import { IADHeaderMark } from "./iad-header"

type Props = {
  year: number
  periodFrom: Date
  periodTo: Date
  data: BilancioResult
  logoUrl?: string | null
}

function formatDateIt(date: Date): string {
  const d = new Date(date)
  const dd = String(d.getUTCDate()).padStart(2, "0")
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const yyyy = d.getUTCFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function formatDateTimeIt(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0")
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const yyyy = date.getFullYear()
  const hh = String(date.getHours()).padStart(2, "0")
  const mi = String(date.getMinutes()).padStart(2, "0")
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`
}

function formatEurFromCents(cents: number): string {
  return `€ ${(cents / 100)
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`
}

function formatPercent(share: number): string {
  return `${(share * 100).toFixed(1).replace(".", ",")}%`
}

function formatSignedEur(cents: number): string {
  const sign = cents >= 0 ? "" : "-"
  return `${sign}${formatEurFromCents(Math.abs(cents))}`
}

function KpiBox({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: "neutral" | "success" | "danger"
}) {
  const color =
    tone === "success"
      ? "#047857"
      : tone === "danger"
        ? "#b91c1c"
        : "#0f172a"
  return (
    <View
      style={{
        width: "25%",
        paddingHorizontal: 4,
      }}
    >
      <View
        style={{
          borderWidth: 0.5,
          borderColor: "#e2e8f0",
          borderRadius: 3,
          padding: 8,
        }}
      >
        <Text
          style={{
            fontSize: 7,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: 0.4,
            marginBottom: 3,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontSize: 12,
            fontFamily: "Helvetica-Bold",
            color,
          }}
        >
          {value}
        </Text>
      </View>
    </View>
  )
}

export function BilancioPDF({
  year,
  periodFrom,
  periodTo,
  data,
  logoUrl,
}: Props) {
  const generatedAt = new Date()
  const { totals, entrateByType, usciteByType } = data

  return (
    <Document
      title={`Bilancio ${year}`}
      author="IAD Portale"
      subject="Bilancio annuale"
    >
      <Page size="A4" style={pdfStyles.page}>
        {/* HEADER */}
        <View style={pdfStyles.headerRow}>
          <IADHeaderMark logoUrl={logoUrl} />
          <View>
            <Text style={pdfStyles.documentTitle}>
              Bilancio annuale {year}
            </Text>
            <Text style={pdfStyles.documentMeta}>
              Periodo {formatDateIt(periodFrom)} — {formatDateIt(periodTo)}
            </Text>
            <Text style={pdfStyles.documentMeta}>
              Emesso il {formatDateTimeIt(generatedAt)}
            </Text>
          </View>
        </View>
        <View style={pdfStyles.headerDivider} />

        {/* KPI */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Indicatori di periodo</Text>
          <View
            style={{
              flexDirection: "row",
              marginHorizontal: -4,
            }}
          >
            <KpiBox
              label="Entrate"
              value={formatEurFromCents(totals.entrateCents)}
              tone="success"
            />
            <KpiBox
              label="Uscite"
              value={formatEurFromCents(totals.usciteCents)}
              tone="danger"
            />
            <KpiBox
              label="Saldo netto"
              value={formatSignedEur(totals.netCents)}
              tone={totals.netCents >= 0 ? "success" : "danger"}
            />
            <KpiBox
              label="Margine"
              value={formatPercent(totals.marginPercent)}
              tone={totals.marginPercent >= 0 ? "success" : "danger"}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              marginTop: 6,
              gap: 12,
            }}
          >
            <Text style={{ fontSize: 8, color: "#64748b" }}>
              Pagamenti contabilizzati: {totals.countEntrate}
            </Text>
            <Text style={{ fontSize: 8, color: "#64748b" }}>
              Spese contabilizzate: {totals.countUscite}
            </Text>
          </View>
        </View>

        {/* ENTRATE PER TIPO */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Entrate per tipologia</Text>
          {entrateByType.length === 0 ? (
            <Text style={pdfStyles.emptyState}>
              Nessuna entrata registrata nel periodo.
            </Text>
          ) : (
            <View style={pdfStyles.table}>
              <View style={pdfStyles.tableHeader}>
                <Text style={[pdfStyles.th, { width: "45%" }]}>Tipologia</Text>
                <Text
                  style={[pdfStyles.th, { width: "15%", textAlign: "right" }]}
                >
                  Nr.
                </Text>
                <Text
                  style={[pdfStyles.th, { width: "25%", textAlign: "right" }]}
                >
                  Importo
                </Text>
                <Text
                  style={[pdfStyles.th, { width: "15%", textAlign: "right" }]}
                >
                  Quota
                </Text>
              </View>
              {entrateByType.map((e: BilancioFeeTypeEntry, idx) => {
                const isLast = idx === entrateByType.length - 1
                return (
                  <View
                    key={e.type}
                    style={
                      isLast ? pdfStyles.tableRowLast : pdfStyles.tableRow
                    }
                  >
                    <Text style={[pdfStyles.td, { width: "45%" }]}>
                      {FEE_TYPE_LABELS[e.type]}
                    </Text>
                    <Text
                      style={[pdfStyles.td, { width: "15%", textAlign: "right" }]}
                    >
                      {e.count}
                    </Text>
                    <Text
                      style={[
                        pdfStyles.tdMono,
                        { width: "25%", textAlign: "right" },
                      ]}
                    >
                      {formatEurFromCents(e.totalCents)}
                    </Text>
                    <Text
                      style={[
                        pdfStyles.tdMuted,
                        { width: "15%", textAlign: "right" },
                      ]}
                    >
                      {formatPercent(e.share)}
                    </Text>
                  </View>
                )
              })}
              <View style={pdfStyles.tableRowTotal}>
                <Text style={[pdfStyles.tdBold, { width: "45%" }]}>
                  Totale entrate
                </Text>
                <Text
                  style={[
                    pdfStyles.tdBold,
                    { width: "15%", textAlign: "right" },
                  ]}
                >
                  {totals.countEntrate}
                </Text>
                <Text
                  style={[
                    pdfStyles.tdBold,
                    {
                      width: "25%",
                      textAlign: "right",
                      fontFamily: "Courier-Bold",
                    },
                  ]}
                >
                  {formatEurFromCents(totals.entrateCents)}
                </Text>
                <Text
                  style={[
                    pdfStyles.tdBold,
                    { width: "15%", textAlign: "right" },
                  ]}
                >
                  100,0%
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* USCITE PER TIPO */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Uscite per tipologia</Text>
          {usciteByType.length === 0 ? (
            <Text style={pdfStyles.emptyState}>
              Nessuna uscita registrata nel periodo.
            </Text>
          ) : (
            <View style={pdfStyles.table}>
              <View style={pdfStyles.tableHeader}>
                <Text style={[pdfStyles.th, { width: "45%" }]}>Tipologia</Text>
                <Text
                  style={[pdfStyles.th, { width: "15%", textAlign: "right" }]}
                >
                  Nr.
                </Text>
                <Text
                  style={[pdfStyles.th, { width: "25%", textAlign: "right" }]}
                >
                  Importo
                </Text>
                <Text
                  style={[pdfStyles.th, { width: "15%", textAlign: "right" }]}
                >
                  Quota
                </Text>
              </View>
              {usciteByType.map((e: BilancioExpenseTypeEntry, idx) => {
                const isLast = idx === usciteByType.length - 1
                return (
                  <View
                    key={e.type}
                    style={
                      isLast ? pdfStyles.tableRowLast : pdfStyles.tableRow
                    }
                  >
                    <Text style={[pdfStyles.td, { width: "45%" }]}>
                      {EXPENSE_TYPE_LABELS[e.type]}
                    </Text>
                    <Text
                      style={[pdfStyles.td, { width: "15%", textAlign: "right" }]}
                    >
                      {e.count}
                    </Text>
                    <Text
                      style={[
                        pdfStyles.tdMono,
                        { width: "25%", textAlign: "right" },
                      ]}
                    >
                      {formatEurFromCents(e.totalCents)}
                    </Text>
                    <Text
                      style={[
                        pdfStyles.tdMuted,
                        { width: "15%", textAlign: "right" },
                      ]}
                    >
                      {formatPercent(e.share)}
                    </Text>
                  </View>
                )
              })}
              <View style={pdfStyles.tableRowTotal}>
                <Text style={[pdfStyles.tdBold, { width: "45%" }]}>
                  Totale uscite
                </Text>
                <Text
                  style={[
                    pdfStyles.tdBold,
                    { width: "15%", textAlign: "right" },
                  ]}
                >
                  {totals.countUscite}
                </Text>
                <Text
                  style={[
                    pdfStyles.tdBold,
                    {
                      width: "25%",
                      textAlign: "right",
                      fontFamily: "Courier-Bold",
                    },
                  ]}
                >
                  {formatEurFromCents(totals.usciteCents)}
                </Text>
                <Text
                  style={[
                    pdfStyles.tdBold,
                    { width: "15%", textAlign: "right" },
                  ]}
                >
                  100,0%
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* SALDO FINALE */}
        <View style={pdfStyles.section} wrap={false}>
          <View
            style={{
              borderWidth: 1,
              borderColor: totals.netCents >= 0 ? "#047857" : "#b91c1c",
              borderRadius: 3,
              padding: 10,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontFamily: "Helvetica-Bold",
              }}
            >
              Risultato di esercizio {year}
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Courier-Bold",
                color: totals.netCents >= 0 ? "#047857" : "#b91c1c",
              }}
            >
              {formatSignedEur(totals.netCents)}
            </Text>
          </View>
        </View>

        {/* FOOTER */}
        <View style={pdfStyles.footer} fixed>
          <View style={pdfStyles.footerLeft}>
            <Text>A.S.D. IAD - Irpinia Arte Danza · Montella (AV)</Text>
            <Text>
              Bilancio generato il {formatDateTimeIt(generatedAt)} tramite IAD
              Portale
            </Text>
          </View>
          <Text
            style={pdfStyles.footerRight}
            render={({ pageNumber, totalPages }) =>
              `Pagina ${pageNumber} di ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  )
}
