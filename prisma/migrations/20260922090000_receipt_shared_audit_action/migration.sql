-- Condivisione della ricevuta dal foglio di iOS (WhatsApp e simili),
-- tracciata in AuditLog come già RECEIPT_EMAIL_SENT.
--
-- Registra che il documento è uscito dal gestionale e quando, NON a chi è
-- andato: il contatto si sceglie dentro il foglio di condivisione del
-- sistema, fuori dalla pagina web, e il browser non lo espone. Per questo
-- non finisce in EmailLog, dove recipient_email è obbligatorio e andrebbe
-- riempito con un dato che non abbiamo.
--
-- ALTER TYPE in una migration a sé: il valore nuovo non è utilizzabile nella
-- stessa transazione in cui viene aggiunto.

ALTER TYPE "AuditAction" ADD VALUE 'RECEIPT_SHARED';
