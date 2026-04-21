import { Document, Page, Text, View } from "@react-pdf/renderer"

import type {
  AthleteForPDF,
  BrandForPDF,
} from "@/app/(admin)/admin/athletes/queries"
import { relationshipOptions } from "@/lib/schemas/guardian"
import { FEE_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/schemas/payment"

import { pdfStyles } from "../styles"
import { IADHeaderMark } from "./iad-header"

type Props = {
  data: AthleteForPDF
  brand?: BrandForPDF | null
}

function formatDateIt(date: Date | null | undefined): string {
  if (!date) return "—"
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

function relationshipLabel(value: string): string {
  return (
    relationshipOptions.find((o) => o.value === value)?.label ?? value
  )
}

function genderLabel(g: "F" | "M" | "OTHER"): string {
  if (g === "F") return "Femmina"
  if (g === "M") return "Maschio"
  return "Altro"
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={pdfStyles.fieldBox}>
      <Text style={pdfStyles.fieldLabel}>{label}</Text>
      <Text style={pdfStyles.fieldValue}>{value || "—"}</Text>
    </View>
  )
}

function composeAddress(a: AthleteForPDF): string {
  const street = [a.residenceStreet, a.residenceNumber].filter(Boolean).join(" ")
  const cityLine = [a.residenceCap, a.residenceCity].filter(Boolean).join(" ")
  const prov = a.residenceProvince ? `(${a.residenceProvince})` : ""
  const all = [street, [cityLine, prov].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ")
  return all || ""
}

export function AthleteCardPDF({ data, brand }: Props) {
  const generatedAt = new Date()
  const fullName = `${data.lastName} ${data.firstName}`
  const address = composeAddress(data)
  const logoUrl = brand?.logoUrl ?? null

  const totalPaidCents = data.payments.reduce(
    (sum, p) => sum + p.amountCents,
    0,
  )

  const dueSchedules = data.enrollments.flatMap((e) =>
    e.paymentSchedules
      .filter((s) => s.status === "DUE" || s.status === "WAIVED")
      .map((s) => ({
        schedule: s,
        courseName: e.course.name,
      })),
  )
  const totalDueCents = dueSchedules.reduce(
    (sum, { schedule }) =>
      schedule.status === "DUE" ? sum + schedule.amountCents : sum,
    0,
  )

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <Document
      title={`Scheda ${fullName}`}
      author="IAD Portale"
      subject="Scheda allieva"
    >
      <Page size="A4" style={pdfStyles.page}>
        {/* HEADER */}
        <View style={pdfStyles.headerRow}>
          <IADHeaderMark logoUrl={logoUrl} />
          <View>
            <Text style={pdfStyles.documentTitle}>Scheda Allieva</Text>
            <Text style={pdfStyles.documentMeta}>
              Emessa il {formatDateTimeIt(generatedAt)}
            </Text>
          </View>
        </View>
        <View style={pdfStyles.headerDivider} />

        {/* SEZIONE 1 — Anagrafica */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.athleteName}>{fullName}</Text>
          <View style={pdfStyles.fieldGrid}>
            <Field
              label="Data di nascita"
              value={formatDateIt(data.dateOfBirth)}
            />
            <Field label="Sesso" value={genderLabel(data.gender)} />
            <Field
              label="Luogo di nascita"
              value={[data.placeOfBirth, data.provinceOfBirth]
                .filter(Boolean)
                .join(" (") + (data.provinceOfBirth ? ")" : "")}
            />
            <Field
              label="Codice fiscale"
              value={data.fiscalCode ?? ""}
            />
            <Field label="Residenza" value={address} />
          </View>
        </View>

        {/* SEZIONE 2 — Genitori/Tutori */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Genitori / Tutori</Text>
          {data.parentRelations.length === 0 ? (
            <Text style={pdfStyles.emptyState}>
              Nessun genitore collegato.
            </Text>
          ) : (
            <View style={pdfStyles.table}>
              <View style={pdfStyles.tableHeader}>
                <Text style={[pdfStyles.th, { width: "30%" }]}>Nome</Text>
                <Text style={[pdfStyles.th, { width: "18%" }]}>Relazione</Text>
                <Text style={[pdfStyles.th, { width: "22%" }]}>Telefono</Text>
                <Text style={[pdfStyles.th, { width: "20%" }]}>Email</Text>
                <Text style={[pdfStyles.th, { width: "10%" }]}>Ruoli</Text>
              </View>
              {data.parentRelations.map((rel, idx) => {
                const roles: string[] = []
                if (rel.isPrimaryContact) roles.push("Contatto")
                if (rel.isPrimaryPayer) roles.push("Paga")
                const isLast = idx === data.parentRelations.length - 1
                return (
                  <View
                    key={rel.id}
                    style={isLast ? pdfStyles.tableRowLast : pdfStyles.tableRow}
                  >
                    <Text style={[pdfStyles.td, { width: "30%" }]}>
                      {rel.parent.lastName} {rel.parent.firstName}
                    </Text>
                    <Text style={[pdfStyles.td, { width: "18%" }]}>
                      {relationshipLabel(rel.relationship)}
                    </Text>
                    <Text style={[pdfStyles.tdMono, { width: "22%" }]}>
                      {rel.parent.phone || "—"}
                    </Text>
                    <Text style={[pdfStyles.td, { width: "20%" }]}>
                      {rel.parent.email || "—"}
                    </Text>
                    <Text style={[pdfStyles.tdMuted, { width: "10%" }]}>
                      {roles.join(" · ") || "—"}
                    </Text>
                  </View>
                )
              })}
            </View>
          )}
        </View>

        {/* SEZIONE 3 — Iscrizioni */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Iscrizioni</Text>
          {data.enrollments.length === 0 ? (
            <Text style={pdfStyles.emptyState}>Nessuna iscrizione.</Text>
          ) : (
            <View style={pdfStyles.table}>
              <View style={pdfStyles.tableHeader}>
                <Text style={[pdfStyles.th, { width: "30%" }]}>Corso</Text>
                <Text style={[pdfStyles.th, { width: "22%" }]}>Insegnante</Text>
                <Text style={[pdfStyles.th, { width: "15%" }]}>Anno</Text>
                <Text style={[pdfStyles.th, { width: "15%" }]}>Iscritta il</Text>
                <Text style={[pdfStyles.th, { width: "18%" }]}>Stato</Text>
              </View>
              {data.enrollments.map((en, idx) => {
                const isLast = idx === data.enrollments.length - 1
                const teacher = en.course.teacher
                const teacherName = teacher
                  ? `${teacher.lastName} ${teacher.firstName}`
                  : "—"
                const withdrawn = Boolean(en.withdrawalDate)
                return (
                  <View
                    key={en.id}
                    style={isLast ? pdfStyles.tableRowLast : pdfStyles.tableRow}
                  >
                    <Text style={[pdfStyles.tdBold, { width: "30%" }]}>
                      {en.course.name}
                    </Text>
                    <Text style={[pdfStyles.td, { width: "22%" }]}>
                      {teacherName}
                    </Text>
                    <Text style={[pdfStyles.td, { width: "15%" }]}>
                      {en.academicYear.label}
                    </Text>
                    <Text style={[pdfStyles.td, { width: "15%" }]}>
                      {formatDateIt(en.enrollmentDate)}
                    </Text>
                    <Text style={[pdfStyles.td, { width: "18%" }]}>
                      {withdrawn
                        ? `Ritirata (${formatDateIt(en.withdrawalDate)})`
                        : "Attiva"}
                    </Text>
                  </View>
                )
              })}
            </View>
          )}
        </View>

        {/* SEZIONE 4 — Pagamenti effettuati */}
        <View style={pdfStyles.section} wrap={false}>
          <Text style={pdfStyles.sectionTitle}>Pagamenti effettuati</Text>
          {data.payments.length === 0 ? (
            <Text style={pdfStyles.emptyState}>
              Nessun pagamento registrato.
            </Text>
          ) : (
            <View style={pdfStyles.table}>
              <View style={pdfStyles.tableHeader}>
                <Text style={[pdfStyles.th, { width: "16%" }]}>Data</Text>
                <Text style={[pdfStyles.th, { width: "22%" }]}>Tipo</Text>
                <Text style={[pdfStyles.th, { width: "28%" }]}>
                  Corso / Nota
                </Text>
                <Text style={[pdfStyles.th, { width: "16%" }]}>Metodo</Text>
                <Text
                  style={[
                    pdfStyles.th,
                    { width: "18%", textAlign: "right" },
                  ]}
                >
                  Importo
                </Text>
              </View>
              {data.payments.map((p) => (
                <View key={p.id} style={pdfStyles.tableRow}>
                  <Text style={[pdfStyles.td, { width: "16%" }]}>
                    {formatDateIt(p.paymentDate)}
                  </Text>
                  <Text style={[pdfStyles.td, { width: "22%" }]}>
                    {FEE_TYPE_LABELS[p.feeType]}
                  </Text>
                  <Text style={[pdfStyles.tdMuted, { width: "28%" }]}>
                    {p.courseEnrollment?.course.name ?? "—"}
                  </Text>
                  <Text style={[pdfStyles.td, { width: "16%" }]}>
                    {PAYMENT_METHOD_LABELS[p.method]}
                  </Text>
                  <Text
                    style={[
                      pdfStyles.tdMono,
                      { width: "18%", textAlign: "right" },
                    ]}
                  >
                    {formatEurFromCents(p.amountCents)}
                  </Text>
                </View>
              ))}
              <View style={pdfStyles.tableRowTotal}>
                <Text style={[pdfStyles.tdBold, { width: "82%" }]}>
                  Totale pagato
                </Text>
                <Text
                  style={[
                    pdfStyles.tdBold,
                    {
                      width: "18%",
                      textAlign: "right",
                      fontFamily: "Courier-Bold",
                    },
                  ]}
                >
                  {formatEurFromCents(totalPaidCents)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* SEZIONE 5 — Scadenze aperte */}
        {dueSchedules.length > 0 ? (
          <View style={pdfStyles.section} wrap={false}>
            <Text style={pdfStyles.sectionTitle}>Scadenze aperte</Text>
            <View style={pdfStyles.table}>
              <View style={pdfStyles.tableHeader}>
                <Text style={[pdfStyles.th, { width: "18%" }]}>Scadenza</Text>
                <Text style={[pdfStyles.th, { width: "32%" }]}>Corso</Text>
                <Text style={[pdfStyles.th, { width: "20%" }]}>Tipo</Text>
                <Text style={[pdfStyles.th, { width: "15%" }]}>Stato</Text>
                <Text
                  style={[
                    pdfStyles.th,
                    { width: "15%", textAlign: "right" },
                  ]}
                >
                  Importo
                </Text>
              </View>
              {dueSchedules.map(({ schedule, courseName }) => {
                const due = new Date(schedule.dueDate)
                due.setHours(0, 0, 0, 0)
                const isOverdue =
                  schedule.status === "DUE" && due.getTime() < today.getTime()
                let statusLabel = "In scadenza"
                if (schedule.status === "WAIVED") statusLabel = "Condonata"
                else if (isOverdue) statusLabel = "In ritardo"
                return (
                  <View key={schedule.id} style={pdfStyles.tableRow}>
                    <Text style={[pdfStyles.td, { width: "18%" }]}>
                      {formatDateIt(schedule.dueDate)}
                    </Text>
                    <Text style={[pdfStyles.tdBold, { width: "32%" }]}>
                      {courseName}
                    </Text>
                    <Text style={[pdfStyles.td, { width: "20%" }]}>
                      {FEE_TYPE_LABELS[schedule.feeType]}
                    </Text>
                    <Text style={[pdfStyles.td, { width: "15%" }]}>
                      {statusLabel}
                    </Text>
                    <Text
                      style={[
                        pdfStyles.tdMono,
                        { width: "15%", textAlign: "right" },
                      ]}
                    >
                      {formatEurFromCents(schedule.amountCents)}
                    </Text>
                  </View>
                )
              })}
              <View style={pdfStyles.tableRowTotal}>
                <Text style={[pdfStyles.tdBold, { width: "85%" }]}>
                  Totale dovuto (esclude condonate)
                </Text>
                <Text
                  style={[
                    pdfStyles.tdBold,
                    {
                      width: "15%",
                      textAlign: "right",
                      fontFamily: "Courier-Bold",
                    },
                  ]}
                >
                  {formatEurFromCents(totalDueCents)}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* FOOTER fisso */}
        <View style={pdfStyles.footer} fixed>
          <View style={pdfStyles.footerLeft}>
            <Text>A.S.D. IAD - Irpinia Arte Danza · Montella (AV)</Text>
            <Text>
              Documento generato il {formatDateTimeIt(generatedAt)} tramite IAD
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
