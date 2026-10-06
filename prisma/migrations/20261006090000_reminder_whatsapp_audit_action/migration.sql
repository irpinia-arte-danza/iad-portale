-- Sollecito aperto su WhatsApp dal gestionale.
--
-- Additiva: un valore nuovo nell'enum, nessuna colonna e nessuna tabella.
-- La traccia va in AuditLog come per la ricevuta condivisa (RECEIPT_SHARED):
-- si registra che il messaggio è uscito da qui con il testo già scritto, non
-- che sia stato inviato — wa.me apre WhatsApp e lì il gestionale non vede
-- più niente.
--
-- ALTER TYPE in una migration a sé: i valori nuovi non sono utilizzabili
-- nella stessa transazione in cui vengono aggiunti.

ALTER TYPE "AuditAction" ADD VALUE 'REMINDER_WHATSAPP_OPENED';
