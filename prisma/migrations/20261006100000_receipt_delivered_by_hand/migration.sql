-- Ricevuta consegnata a mano.
--
-- Additiva: un valore nuovo nell'enum, nessuna colonna e nessuna tabella. La
-- traccia va in AuditLog come la condivisione (RECEIPT_SHARED) e il sollecito
-- su WhatsApp (REMINDER_WHATSAPP_OPENED): si registra che il documento è
-- uscito dal gestionale e quando, non a chi è arrivato.
--
-- ALTER TYPE in una migration a sé: i valori nuovi non sono utilizzabili
-- nella stessa transazione in cui vengono aggiunti.

ALTER TYPE "AuditAction" ADD VALUE 'RECEIPT_DELIVERED_BY_HAND';
