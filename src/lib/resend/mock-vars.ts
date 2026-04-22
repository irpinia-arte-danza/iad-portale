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
]
