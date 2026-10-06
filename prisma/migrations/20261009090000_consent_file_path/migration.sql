-- Modulo firmato allegato al consenso: percorso del file nel bucket privato
-- "consents". Colonna nuova, nullable: nessuna riga esistente cambia.
-- Non unica: lo stesso modulo può coprire più consensi e più sorelle.

ALTER TABLE "consents" ADD COLUMN "file_path" TEXT;

-- "Questo file lo usa ancora qualcuno?" prima di toglierlo dallo Storage
CREATE INDEX "consents_file_path_idx" ON "consents"("file_path");
