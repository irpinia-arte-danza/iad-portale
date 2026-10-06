-- Irrobustimento: contatore dei tentativi di accesso, lato portale.
-- Dopo 5 falliti in 10 minuti (per email o per IP) il login rifiuta per 15
-- minuti; «Password dimenticata» conta per IP. Il cron notturno cancella le
-- righe più vecchie di 24 ore. Tabella nuova, nessuna riga esistente cambia.

CREATE TYPE "LoginAttemptKind" AS ENUM ('LOGIN', 'RESET');

CREATE TABLE "login_attempts" (
    "id" UUID NOT NULL,
    "kind" "LoginAttemptKind" NOT NULL,
    "email" TEXT,
    "ip" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "login_attempts_email_created_at_idx" ON "login_attempts"("email", "created_at");
CREATE INDEX "login_attempts_ip_created_at_idx" ON "login_attempts"("ip", "created_at");
