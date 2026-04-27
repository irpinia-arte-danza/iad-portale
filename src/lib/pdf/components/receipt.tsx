import { Document, Page, Text, View } from "@react-pdf/renderer"

import { FEE_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/schemas/payment"
import type { FeeType, PaymentMethod } from "@prisma/client"

import { pdfColors, pdfStyles } from "../styles"
import { IADHeaderMark } from "./iad-header"

export type ReceiptBrand = {
  asdName: string
  asdFiscalCode: string
  asdVatNumber: string | null
  asdEmail: string
  asdPhone: string | null
  asdIban: string | null
  addressStreet: string | null
  addressZip: string | null
  addressCity: string | null
  addressProvince: string | null
  asdAddress: string | null
  logoUrl: string | null
  logoSvgUrl: string | null
}

export type ReceiptData = {
  receiptNumber: string
  issueDate: Date
  payerName: string
  payerFiscalCode: string | null
  payerAddress: string | null
  athleteName: string
  athleteFiscalCode: string | null
  feeType: FeeType
  description: string | null
  periodStart: Date | null
  periodEnd: Date | null
  amountCents: number
  method: PaymentMethod
  paymentDate: Date
  receiptFooter: string | null
}

function formatDateIt(date: Date | null | undefined): string {
  if (!date) return "—"
  const d = new Date(date)
  const dd = String(d.getUTCDate()).padStart(2, "0")
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const yyyy = d.getUTCFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function formatEurFromCents(cents: number): string {
  return `€ ${(cents / 100)
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`
}

function composeAddress(b: ReceiptBrand): string {
  const parts = [
    b.addressStreet,
    [b.addressZip, b.addressCity, b.addressProvince ? `(${b.addressProvince})` : null]
      .filter(Boolean)
      .join(" "),
  ].filter((p): p is string => !!p && p.trim().length > 0)
  return parts.length > 0 ? parts.join(" — ") : b.asdAddress ?? ""
}

const TUIR_NOTICE =
  "Spesa detraibile ai fini IRPEF (art. 15 c.1 lett. i-quinquies TUIR) per ragazzi 5-18 anni — conservare la presente ricevuta."

const styles = {
  brandBlock: {
    flexDirection: "column" as const,
    alignItems: "flex-end" as const,
  },
  brandLine: {
    fontSize: 8,
    color: pdfColors.muted,
    textAlign: "right" as const,
  },
  brandLineBold: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.text,
    textAlign: "right" as const,
  },
  receiptTitleBlock: {
    flexDirection: "column" as const,
    alignItems: "flex-end" as const,
    marginBottom: 12,
  },
  receiptNumber: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.accent,
  },
  receiptDate: {
    fontSize: 9,
    color: pdfColors.muted,
    marginTop: 2,
  },
  partyRow: {
    flexDirection: "row" as const,
    gap: 12,
    marginBottom: 12,
  },
  partyBox: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: pdfColors.border,
    borderRadius: 2,
    padding: 8,
  },
  partyLabel: {
    fontSize: 8,
    color: pdfColors.muted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  partyName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.text,
    marginBottom: 2,
  },
  partyMeta: {
    fontSize: 9,
    color: pdfColors.muted,
  },
  totalsRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    backgroundColor: pdfColors.accentSoft,
    borderRadius: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  totalsLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.accent,
    textTransform: "uppercase" as const,
    letterSpacing: 0.6,
  },
  totalsValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.accent,
  },
  noticeBox: {
    marginTop: 14,
    padding: 8,
    borderWidth: 0.5,
    borderColor: pdfColors.border,
    borderStyle: "dashed" as const,
    borderRadius: 2,
  },
  noticeText: {
    fontSize: 8,
    color: pdfColors.muted,
    lineHeight: 1.4,
  },
}

export function ReceiptPdf({
  receipt,
  brand,
}: {
  receipt: ReceiptData
  brand: ReceiptBrand
}) {
  const address = composeAddress(brand)
  const logoForPdf = brand.logoSvgUrl ?? brand.logoUrl ?? null

  let periodLine: string | null = null
  if (receipt.periodStart && receipt.periodEnd) {
    periodLine = `Periodo: ${formatDateIt(receipt.periodStart)} – ${formatDateIt(receipt.periodEnd)}`
  } else if (receipt.periodStart) {
    periodLine = `A partire dal ${formatDateIt(receipt.periodStart)}`
  }

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.headerRow}>
          <IADHeaderMark logoUrl={logoForPdf} />
          <View style={styles.brandBlock}>
            <Text style={styles.brandLineBold}>{brand.asdName}</Text>
            {address ? <Text style={styles.brandLine}>{address}</Text> : null}
            <Text style={styles.brandLine}>
              C.F. {brand.asdFiscalCode}
              {brand.asdVatNumber ? ` · P.IVA ${brand.asdVatNumber}` : ""}
            </Text>
            <Text style={styles.brandLine}>
              {brand.asdEmail}
              {brand.asdPhone ? ` · ${brand.asdPhone}` : ""}
            </Text>
            {brand.asdIban ? (
              <Text style={styles.brandLine}>IBAN {brand.asdIban}</Text>
            ) : null}
          </View>
        </View>
        <View style={pdfStyles.headerDivider} />

        {/* Receipt number */}
        <View style={styles.receiptTitleBlock}>
          <Text style={styles.receiptNumber}>
            Ricevuta {receipt.receiptNumber}
          </Text>
          <Text style={styles.receiptDate}>
            Emessa il {formatDateIt(receipt.issueDate)}
          </Text>
        </View>

        {/* Party row: pagante + per conto di */}
        <View style={styles.partyRow}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Ricevuto da</Text>
            <Text style={styles.partyName}>{receipt.payerName}</Text>
            {receipt.payerFiscalCode ? (
              <Text style={styles.partyMeta}>
                C.F. {receipt.payerFiscalCode}
              </Text>
            ) : null}
            {receipt.payerAddress ? (
              <Text style={styles.partyMeta}>{receipt.payerAddress}</Text>
            ) : null}
          </View>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Per conto di (allieva)</Text>
            <Text style={styles.partyName}>{receipt.athleteName}</Text>
            {receipt.athleteFiscalCode ? (
              <Text style={styles.partyMeta}>
                C.F. {receipt.athleteFiscalCode}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Causale */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Causale</Text>
          <View style={pdfStyles.fieldGrid}>
            <View style={pdfStyles.fieldBox}>
              <Text style={pdfStyles.fieldLabel}>Tipo quota</Text>
              <Text style={pdfStyles.fieldValue}>
                {FEE_TYPE_LABELS[receipt.feeType]}
              </Text>
            </View>
            <View style={pdfStyles.fieldBox}>
              <Text style={pdfStyles.fieldLabel}>Data pagamento</Text>
              <Text style={pdfStyles.fieldValue}>
                {formatDateIt(receipt.paymentDate)}
              </Text>
            </View>
            <View style={pdfStyles.fieldBox}>
              <Text style={pdfStyles.fieldLabel}>Modalità</Text>
              <Text style={pdfStyles.fieldValue}>
                {PAYMENT_METHOD_LABELS[receipt.method]}
              </Text>
            </View>
            {periodLine ? (
              <View style={pdfStyles.fieldBox}>
                <Text style={pdfStyles.fieldLabel}>Periodo</Text>
                <Text style={pdfStyles.fieldValue}>{periodLine}</Text>
              </View>
            ) : null}
            {receipt.description ? (
              <View style={{ ...pdfStyles.fieldBox, width: "100%" }}>
                <Text style={pdfStyles.fieldLabel}>Descrizione</Text>
                <Text style={pdfStyles.fieldValue}>{receipt.description}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Importo ricevuto</Text>
            <Text style={styles.totalsValue}>
              {formatEurFromCents(receipt.amountCents)}
            </Text>
          </View>
        </View>

        {/* TUIR + custom footer */}
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>{TUIR_NOTICE}</Text>
          {receipt.receiptFooter ? (
            <Text style={{ ...styles.noticeText, marginTop: 4 }}>
              {receipt.receiptFooter}
            </Text>
          ) : null}
        </View>

        {/* Footer */}
        <View style={pdfStyles.footer} fixed>
          <Text style={pdfStyles.footerLeft}>
            {brand.asdName} — Ricevuta non fiscale ai sensi della normativa per
            le associazioni sportive dilettantistiche
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
