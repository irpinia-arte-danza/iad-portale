-- PDF delle ricevute archiviati su Supabase Storage (bucket privato "receipts").
-- La colonna pdf_url, mai valorizzata né letta, diventa il percorso del file
-- nel bucket: <anno di emissione>/<numero ricevuta>.pdf
ALTER TABLE "receipts" RENAME COLUMN "pdf_url" TO "pdf_path";
