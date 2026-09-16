-- Collegamento fra un'email inviata e la ricevuta allegata.
--
-- Serve a ricavare lo stato "inviata / non inviata" e lo storico degli invii
-- senza aggiungere campi sulla tabella receipts: il dato vive dove vivono già
-- gli altri invii, accanto a athlete_id, parent_id e payment_schedule_id.
-- Nessuna FK, come per le altre colonne di collegamento di email_logs.

ALTER TABLE "email_logs" ADD COLUMN "receipt_id" UUID;

CREATE INDEX "email_logs_receipt_id_sent_at_idx"
  ON "email_logs"("receipt_id", "sent_at");
