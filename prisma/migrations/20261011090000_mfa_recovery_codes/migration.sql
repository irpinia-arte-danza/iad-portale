-- Secondo fattore degli admin: codici di recupero generati dal portale,
-- salvati solo come hash bcrypt, monouso (used_at). Lo stato del fattore
-- TOTP vive in Supabase Auth, non qui. Tabella nuova, nessuna riga
-- esistente cambia.

CREATE TABLE "mfa_recovery_codes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_recovery_codes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mfa_recovery_codes_user_id_idx" ON "mfa_recovery_codes"("user_id");

ALTER TABLE "mfa_recovery_codes"
  ADD CONSTRAINT "mfa_recovery_codes_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
