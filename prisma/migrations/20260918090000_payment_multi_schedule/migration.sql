-- Un pagamento può chiudere più scadenze della stessa allieva: una consegna di
-- denaro, una ricevuta. Cadono i vincoli 1:1 tra pagamento e scadenza, tra
-- pagamento e iscrizione stage, tra pagamento e costume.

DROP INDEX "payment_schedules_payment_id_key";
CREATE INDEX "payment_schedules_payment_id_idx" ON "payment_schedules"("payment_id");

DROP INDEX "stage_enrollments_payment_id_key";
CREATE INDEX "stage_enrollments_payment_id_idx" ON "stage_enrollments"("payment_id");

DROP INDEX "costume_assignments_payment_id_key";
CREATE INDEX "costume_assignments_payment_id_idx" ON "costume_assignments"("payment_id");

-- Righe della causale congelate all'emissione, per le ricevute che coprono
-- più scadenze: [{ "description", "amountCents", "feeType" }]
ALTER TABLE "receipts" ADD COLUMN "lines" JSONB;
