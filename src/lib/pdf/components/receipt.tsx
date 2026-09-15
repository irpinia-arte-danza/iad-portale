import { Document, Page, Text, View } from "@react-pdf/renderer"

import { receiptPaymentNotice } from "@/lib/payments/traceability"
import { FEE_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/schemas/payment"
import type { FeeType, PaymentMethod } from "@prisma/client"
import type { ReceiptLine } from "@/lib/receipts/types"

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
  // Righe della causale (pagamento che chiude più scadenze), null = singola
  lines: ReceiptLine[] | null
  periodStart: Date | null
  periodEnd: Date | null
  amountCents: number
  method: PaymentMethod
  // Metodi di tutti i pagamenti coperti dalla ricevuta (oggi uno solo: una
  // ricevuta = un pagamento). Decidono la dicitura in calce.
  paymentMethods: PaymentMethod[]
  paymentDate: Date
  receiptFooter: string | null
}

// Documento "come emesso", quello che si archivia: l'annullamento non entra
// qui, si aggiunge sopra il file archiviato (src/lib/receipts/cancelled-stamp.ts)

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

// Testo invariato: cambia solo quando compare (receiptPaymentNotice)
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
  // Causale a righe: una riga per scadenza, il totale resta in totalsRow
  linesTable: {
    marginTop: 8,
    borderWidth: 0.5,
    borderColor: pdfColors.border,
    borderRadius: 2,
  },
  linesHeader: {
    flexDirection: "row" as const,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: pdfColors.accentSoft,
  },
  linesHeaderText: {
    fontSize: 8,
    color: pdfColors.muted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.4,
  },
  lineRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderTopWidth: 0.5,
    borderTopColor: pdfColors.border,
  },
  lineDescription: {
    flex: 1,
    fontSize: 9,
    color: pdfColors.text,
    paddingRight: 8,
  },
  lineAmount: {
    width: 90,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.text,
    textAlign: "right" as const,
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
  // Solo logo raster (PNG/JPG), come bilancio e scheda allieva. L'Image di
  // react-pdf non gestisce l'SVG caricato in Impostazioni: il layout dei testi
  // dell'SVG lancia "Cannot read properties of undefined (reading 'xAdvance')".
  const logoForPdf = brand.logoUrl ?? null

  const paymentNotice = receiptPaymentNotice(receipt.paymentMethods)

  // Più scadenze: tutti i tipi quota coperti ("Quota associativa + Quota mensile")
  const feeTypeLabel = receipt.lines
    ? [...new Set(receipt.lines.map((line) => FEE_TYPE_LABELS[line.feeType]))].join(
        " + ",
      )
    : FEE_TYPE_LABELS[receipt.feeType]

  let periodLine: string | null = null
  // Il campo ha già l'etichetta "Periodo": qui solo le date
  if (receipt.periodStart && receipt.periodEnd) {
    periodLine = `${formatDateIt(receipt.periodStart)} – ${formatDateIt(receipt.periodEnd)}`
  } else if (receipt.periodStart) {
    periodLine = `dal ${formatDateIt(receipt.periodStart)}`
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
                {feeTypeLabel}
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
            {receipt.description && !receipt.lines ? (
              <View style={{ ...pdfStyles.fieldBox, width: "100%" }}>
                <Text style={pdfStyles.fieldLabel}>Descrizione</Text>
                <Text style={pdfStyles.fieldValue}>{receipt.description}</Text>
              </View>
            ) : null}
          </View>

          {receipt.lines ? (
            <View style={styles.linesTable}>
              <View style={styles.linesHeader}>
                <Text style={{ ...styles.linesHeaderText, flex: 1 }}>
                  Descrizione
                </Text>
                <Text
                  style={{
                    ...styles.linesHeaderText,
                    width: 90,
                    textAlign: "right" as const,
                  }}
                >
                  Importo
                </Text>
              </View>
              {receipt.lines.map((line, index) => (
                <View
                  key={`${index}-${line.description}`}
                  style={styles.lineRow}
                  wrap={false}
                >
                  <Text style={styles.lineDescription}>{line.description}</Text>
                  <Text style={styles.lineAmount}>
                    {formatEurFromCents(line.amountCents)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Importo ricevuto</Text>
            <Text style={styles.totalsValue}>
              {formatEurFromCents(receipt.amountCents)}
            </Text>
          </View>
        </View>

        {/* Dicitura TUIR solo con pagamenti tracciabili, altrimenti riga neutra
            sul metodo; poi il testo libero in calce */}
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            {paymentNotice.kind === "TAX_DEDUCTION"
              ? TUIR_NOTICE
              : `Metodo di pagamento: ${paymentNotice.methods
                  .map((m) => PAYMENT_METHOD_LABELS[m])
                  .join(", ")}.`}
          </Text>
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
