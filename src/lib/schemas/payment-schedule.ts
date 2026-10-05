import { z } from "zod"

export const waiveScheduleSchema = z.object({
  waiverReason: z
    .string()
    .trim()
    .min(3, "Indica il motivo (almeno 3 caratteri)")
    .max(500, "Motivo troppo lungo (max 500 caratteri)"),
})

export type WaiveScheduleValues = z.infer<typeof waiveScheduleSchema>

// Modifica dell'importo di una scadenza non pagata, nei due versi.
//
// Serve perché all'incasso l'importo può solo SCENDERE (si allinea a quanto
// incassato davvero) e non esisteva modo di riportarlo su: se un pagamento
// ridotto viene poi annullato, la scadenza torna dovuta con l'importo
// abbassato e l'incasso pieno resta bloccato dal controllo sul massimo.
//
// Il motivo è obbligatorio: un importo cambiato a mano senza una ragione
// scritta, riletto a mesi di distanza, è indistinguibile da un errore.
export const scheduleAmountSchema = z.object({
  amountEur: z
    .number({ message: "Importo obbligatorio" })
    .positive("L'importo deve essere maggiore di zero")
    .max(10000, "Importo troppo alto"),
  reason: z
    .string()
    .trim()
    .min(3, "Indica il motivo (almeno 3 caratteri)")
    .max(500, "Motivo troppo lungo (max 500 caratteri)"),
})

export type ScheduleAmountValues = z.infer<typeof scheduleAmountSchema>
