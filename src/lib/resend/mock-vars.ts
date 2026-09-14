import type { TemplateVars } from "./template-vars"

export type TemplateVarGroup = {
  label: string
  vars: { key: string; description: string }[]
}

export const MOCK_TEMPLATE_VARS: TemplateVars = {
  genitore_nome: "Maria Rossi",
  allieva_nome: "Elena Rossi",
  importo: "50,00",
  data_scadenza: "15/10/2025",
  mese: "Ottobre 2025",
  corso_nome: "Hip Hop Giovanissimi",
  tipo_quota: "Mensile",
  data_pagamento: "03/10/2025",
  metodo: "Bonifico",
  destinatario_nome: "Maria Rossi",
  area_nome: "area genitori",
  descrizione_area: "consultare quote, ricevute, presenze e orari delle tue figlie",
  link_accesso: "https://area.irpiniaartedanza.it/auth/confirm?esempio",
  link_recupero: "https://area.irpiniaartedanza.it/password-dimenticata",
  asd_nome: "A.S.D. IAD Irpinia Arte Danza",
  asd_email: "info@irpiniaartedanza.it",
}

export const TEMPLATE_VAR_GROUPS: TemplateVarGroup[] = [
  {
    label: "Destinatario",
    vars: [
      { key: "genitore_nome", description: "Nome e cognome del genitore" },
      { key: "allieva_nome", description: "Nome e cognome dell'allieva" },
    ],
  },
  {
    label: "Scadenza",
    vars: [
      { key: "importo", description: "Importo formattato (es. 50,00)" },
      { key: "data_scadenza", description: "Data scadenza (15/10/2025)" },
      { key: "mese", description: "Mese e anno (Ottobre 2025)" },
      { key: "tipo_quota", description: "Tipo quota (Mensile, Stage, ...)" },
      { key: "corso_nome", description: "Nome del corso" },
    ],
  },
  {
    label: "Pagamento (conferma)",
    vars: [
      { key: "data_pagamento", description: "Data pagamento ricevuto" },
      { key: "metodo", description: "Metodo (Bonifico, Contanti, ...)" },
    ],
  },
  {
    label: "Accesso area riservata",
    vars: [
      { key: "destinatario_nome", description: "Nome e cognome di genitore o insegnante" },
      { key: "area_nome", description: "Area genitori / area insegnanti" },
      { key: "descrizione_area", description: "Cosa si può fare nell'area" },
      { key: "link_accesso", description: "Link personale (obbligatorio nel testo)" },
      { key: "link_recupero", description: "Pagina «Password dimenticata»" },
      { key: "asd_nome", description: "Nome dell'associazione" },
      { key: "asd_email", description: "Email della segreteria" },
    ],
  },
]
