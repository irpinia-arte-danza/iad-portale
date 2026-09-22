-- Numerazione delle ricevute configurabile, a scelte chiuse.
--
-- Fino a ieri il formato era fisso: prefisso + anno accademico + progressivo
-- a tre cifre, serie unica e continua. Ora prefisso, presenza e tipo
-- dell'anno, riavvio e cifre si impostano da Impostazioni → Ricevute.
--
-- I DEFAULT RIPRODUCONO ESATTAMENTE IL COMPORTAMENTO ATTUALE: anno
-- accademico, nessun riavvio, tre cifre. Dopo il deploy non cambia niente
-- finché non si sceglie diversamente dalle impostazioni.

CREATE TYPE "ReceiptYearMode" AS ENUM ('NONE', 'CALENDAR', 'ACADEMIC');
CREATE TYPE "ReceiptResetMode" AS ENUM ('NEVER', 'CALENDAR', 'ACADEMIC');

ALTER TABLE "receipt_settings"
  ADD COLUMN "receipt_year_mode" "ReceiptYearMode" NOT NULL DEFAULT 'ACADEMIC',
  ADD COLUMN "receipt_reset_mode" "ReceiptResetMode" NOT NULL DEFAULT 'NEVER',
  ADD COLUMN "receipt_digits" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "receipt_period" TEXT;

-- Il contatore esistente appartiene al periodo "nessun riavvio": così la
-- prima emissione dopo il deploy incrementa e non riparte.
UPDATE "receipt_settings" SET "receipt_period" = 'ALL' WHERE "receipt_period" IS NULL;

-- Nessuna colonna sulle ricevute: l'appartenenza di una ricevuta al periodo
-- si ricava dalla sua data di emissione. Congelare la chiave al momento
-- dell'emissione sembrava più solido, ma renderebbe sbagliato il primo
-- cambio di configurazione: passando al riavvio solare a dicembre, le
-- ricevute già emesse risulterebbero di un altro periodo e il progressivo
-- ripartirebbe da 1 a metà anno invece di proseguire.
