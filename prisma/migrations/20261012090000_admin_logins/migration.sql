-- Storico degli accessi degli admin (90 giorni) e dispositivi conosciuti.
-- Additiva: nessuna tabella esistente viene toccata.

-- CreateEnum
CREATE TYPE "AdminLoginOutcome" AS ENUM ('OK', 'WRONG_PASSWORD', 'WRONG_MFA', 'BLOCKED');

-- CreateTable
CREATE TABLE "admin_logins" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "outcome" "AdminLoginOutcome" NOT NULL,
    "ip" TEXT NOT NULL,
    "country" TEXT,
    "device" TEXT NOT NULL,
    "device_id" TEXT,
    "new_device" BOOLEAN NOT NULL DEFAULT false,
    "session_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_logins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_devices" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "first_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "forgotten_at" TIMESTAMPTZ(6),

    CONSTRAINT "admin_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_logins_user_id_created_at_idx" ON "admin_logins"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "admin_logins_created_at_idx" ON "admin_logins"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "admin_devices_user_id_device_id_key" ON "admin_devices"("user_id", "device_id");

-- AddForeignKey
ALTER TABLE "admin_logins" ADD CONSTRAINT "admin_logins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_devices" ADD CONSTRAINT "admin_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
