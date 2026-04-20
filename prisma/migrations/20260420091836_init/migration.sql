-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'PARENT', 'TEACHER');

-- CreateEnum
CREATE TYPE "AthleteStatus" AS ENUM ('TRIAL', 'ACTIVE', 'SUSPENDED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('F', 'M', 'OTHER');

-- CreateEnum
CREATE TYPE "AcquisitionSource" AS ENUM ('WORD_OF_MOUTH', 'FLYERS', 'INSTAGRAM', 'FACEBOOK', 'RETURNING', 'OTHER');

-- CreateEnum
CREATE TYPE "CourseType" AS ENUM ('GIOCO_DANZA', 'PROPEDEUTICA', 'DANZA_CLASSICA', 'DANZA_MODERNA', 'DANZA_CONTEMPORANEA', 'OTHER');

-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT');

-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('ASSOCIATION', 'MONTHLY', 'TRIMESTER', 'STAGE', 'SHOWCASE_1', 'SHOWCASE_2', 'COSTUME', 'TRIAL_LESSON', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'POS', 'SUMUP_LINK', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'REVERSED');

-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('RENT', 'TAX_F24', 'UTILITY', 'COMPENSATION', 'COSTUME_PURCHASE', 'MATERIAL', 'INSURANCE', 'AFFILIATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ReceiptCategory" AS ENUM ('REGULAR', 'SHOWCASE', 'COSTUME', 'COMPENSATION', 'BLANK');

-- CreateEnum
CREATE TYPE "AffiliationEntity" AS ENUM ('ENDAS', 'CSEN');

-- CreateEnum
CREATE TYPE "AffiliationStatus" AS ENUM ('PENDING', 'SENT', 'CONFIRMED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('REGULATION', 'WITHDRAWAL_TERMS', 'IMAGE_RELEASE', 'PAYMENT_TERMS', 'GDPR');

-- CreateEnum
CREATE TYPE "ConsentMethod" AS ENUM ('ONLINE', 'PAPER');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('ENROLLMENT_FORM', 'TRIAL_FORM', 'MEDICAL_CERTIFICATE_SCAN', 'IDENTITY_DOCUMENT', 'OTHER_SCAN');

-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('WELCOME_PARENT', 'PAYMENT_REMINDER_1', 'PAYMENT_REMINDER_2', 'PAYMENT_REMINDER_MANUAL', 'PAYMENT_RECEIVED', 'RECEIPT', 'MEDICAL_CERTIFICATE_EXPIRING', 'SUSPENSION_NOTICE', 'STAGE_CONFIRMATION', 'SHOWCASE_REMINDER', 'BROADCAST', 'PASSWORD_RESET', 'CONSENT_REREQUEST', 'OTHER');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'SOFT_DELETE', 'RESTORE', 'LOGIN', 'LOGOUT', 'EXPORT', 'REVERSE_PAYMENT', 'CONSENT_REVOKED', 'SUSPENSION', 'BRAND_UPDATE', 'REMINDER_SENT', 'BULK_EMAIL');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PARENT',
    "first_name" TEXT,
    "last_name" TEXT,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "theme_preference" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_years" (
    "id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "association_fee_cents" INTEGER NOT NULL,
    "monthly_renewal_day" INTEGER NOT NULL DEFAULT 10,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_years" (
    "id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "fiscal_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athletes" (
    "id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "fiscal_code" TEXT NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "place_of_birth" TEXT NOT NULL,
    "province_of_birth" CHAR(2) NOT NULL,
    "gender" "Gender" NOT NULL DEFAULT 'F',
    "residence_street" TEXT NOT NULL,
    "residence_number" TEXT NOT NULL,
    "residence_city" TEXT NOT NULL,
    "residence_province" CHAR(2) NOT NULL,
    "residence_cap" VARCHAR(5) NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "photo_url" TEXT,
    "medical_notes" TEXT,
    "instructor_notes" TEXT,
    "size" TEXT,
    "status" "AthleteStatus" NOT NULL DEFAULT 'TRIAL',
    "acquisition_source" "AcquisitionSource",
    "enrollment_date" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "athletes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_status_history" (
    "id" UUID NOT NULL,
    "athlete_id" UUID NOT NULL,
    "old_status" "AthleteStatus" NOT NULL,
    "new_status" "AthleteStatus" NOT NULL,
    "reason" TEXT,
    "changed_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "athlete_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parents" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "fiscal_code" TEXT NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "place_of_birth" TEXT,
    "residence_street" TEXT NOT NULL,
    "residence_number" TEXT NOT NULL,
    "residence_city" TEXT NOT NULL,
    "residence_province" CHAR(2) NOT NULL,
    "residence_cap" VARCHAR(5) NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "reminders_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "parents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_parents" (
    "id" UUID NOT NULL,
    "athlete_id" UUID NOT NULL,
    "parent_id" UUID NOT NULL,
    "relationship" TEXT NOT NULL,
    "is_primary_payer" BOOLEAN NOT NULL DEFAULT false,
    "is_pickup_authorized" BOOLEAN NOT NULL DEFAULT true,
    "has_parental_authority" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "athlete_parents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teachers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "fiscal_code" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "qualifications" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CourseType" NOT NULL,
    "description" TEXT,
    "min_age" INTEGER,
    "max_age" INTEGER,
    "level" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 20,
    "monthly_fee_cents" INTEGER NOT NULL,
    "trimester_fee_cents" INTEGER,
    "teacher_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_schedules" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "location" TEXT,
    "valid_from" DATE NOT NULL,
    "valid_to" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_enrollments" (
    "id" UUID NOT NULL,
    "athlete_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "enrollment_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawal_date" DATE,

    CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" UUID NOT NULL,
    "schedule_id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "status" "LessonStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "athlete_id" UUID NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "notes" TEXT,
    "marked_by" UUID,
    "marked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stages" (
    "id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" DATE NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "location" TEXT,
    "capacity" INTEGER NOT NULL,
    "fee_cents" INTEGER NOT NULL,
    "registration_open" BOOLEAN NOT NULL DEFAULT true,
    "registration_deadline" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_enrollments" (
    "id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "athlete_id" UUID NOT NULL,
    "enrolled_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enrolled_by" UUID,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "payment_id" UUID,
    "notes" TEXT,

    CONSTRAINT "stage_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "showcases" (
    "id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" DATE NOT NULL,
    "location" TEXT,
    "rehearsal_date" DATE,
    "first_installment_cents" INTEGER NOT NULL,
    "second_installment_cents" INTEGER NOT NULL,
    "first_deadline" DATE NOT NULL,
    "second_deadline" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "showcases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "showcase_participations" (
    "id" UUID NOT NULL,
    "showcase_id" UUID NOT NULL,
    "athlete_id" UUID NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_at" TIMESTAMPTZ(6),
    "choreography" TEXT,
    "notes" TEXT,

    CONSTRAINT "showcase_participations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "costumes" (
    "id" UUID NOT NULL,
    "showcase_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cost_cents" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "costumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "costume_assignments" (
    "id" UUID NOT NULL,
    "costume_id" UUID NOT NULL,
    "participation_id" UUID NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "payment_id" UUID,

    CONSTRAINT "costume_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "athlete_id" UUID NOT NULL,
    "parent_id" UUID,
    "academic_year_id" UUID NOT NULL,
    "fiscal_year_id" UUID NOT NULL,
    "fee_type" "FeeType" NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PAID',
    "period_start" DATE,
    "period_end" DATE,
    "payment_date" DATE NOT NULL,
    "notes" TEXT,
    "reversal_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "fiscal_year_id" UUID NOT NULL,
    "academic_year_id" UUID,
    "type" "ExpenseType" NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "expense_date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "recipient" TEXT,
    "document_url" TEXT,
    "compensation_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_compensations" (
    "id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "fiscal_year_id" UUID NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "payment_date" DATE NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "receipt_number" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "teacher_compensations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" UUID NOT NULL,
    "payment_id" UUID,
    "category" "ReceiptCategory" NOT NULL,
    "receipt_number" TEXT NOT NULL,
    "issue_date" DATE NOT NULL,
    "payer_name" TEXT,
    "payer_fiscal_code" TEXT,
    "description" TEXT,
    "amount_cents" INTEGER,
    "pdf_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_certificates" (
    "id" UUID NOT NULL,
    "athlete_id" UUID NOT NULL,
    "issue_date" DATE NOT NULL,
    "expiry_date" DATE NOT NULL,
    "doctor_name" TEXT,
    "type" TEXT NOT NULL DEFAULT 'non-agonistica',
    "file_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "medical_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurances" (
    "id" UUID NOT NULL,
    "athlete_id" UUID NOT NULL,
    "policy_name" TEXT NOT NULL,
    "policy_number" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_suspended" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "insurances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliations" (
    "id" UUID NOT NULL,
    "athlete_id" UUID NOT NULL,
    "entity" "AffiliationEntity" NOT NULL,
    "status" "AffiliationStatus" NOT NULL DEFAULT 'PENDING',
    "card_number" TEXT,
    "card_year" INTEGER NOT NULL,
    "sent_at" TIMESTAMPTZ(6),
    "confirmed_at" TIMESTAMPTZ(6),
    "expiry_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "affiliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" UUID NOT NULL,
    "athlete_id" UUID,
    "parent_id" UUID,
    "type" "ConsentType" NOT NULL,
    "accepted" BOOLEAN NOT NULL,
    "document_version" TEXT NOT NULL,
    "method" "ConsentMethod" NOT NULL,
    "accepted_at" TIMESTAMPTZ(6) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "revoked_at" TIMESTAMPTZ(6),
    "revoke_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_documents" (
    "id" UUID NOT NULL,
    "type" "ConsentType" NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "pdf_url" TEXT,
    "effective_from" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "athlete_id" UUID NOT NULL,
    "type" "DocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "uploaded_by" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" UUID NOT NULL,
    "type" "EmailType" NOT NULL,
    "to_email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'QUEUED',
    "error_message" TEXT,
    "resend_id" TEXT,
    "sent_at" TIMESTAMPTZ(6),
    "triggered_by" UUID,
    "athlete_id" UUID,
    "parent_id" UUID,
    "payment_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminder_config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "first_reminder_days_after" INTEGER NOT NULL DEFAULT 3,
    "second_reminder_days_after" INTEGER NOT NULL DEFAULT 10,
    "suspension_days_after" INTEGER NOT NULL DEFAULT 20,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reminder_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "logo_url" TEXT,
    "logo_dark_url" TEXT,
    "favicon_url" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '#171717',
    "secondary_color" TEXT NOT NULL DEFAULT '#737373',
    "asd_name" TEXT NOT NULL,
    "asd_address" TEXT NOT NULL,
    "asd_fiscal_code" TEXT NOT NULL,
    "asd_email" TEXT NOT NULL,
    "asd_phone" TEXT,
    "asd_website" TEXT,
    "asd_iban" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "brand_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" "AuditAction" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "changes" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "academic_years_label_key" ON "academic_years"("label");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_years_year_key" ON "fiscal_years"("year");

-- CreateIndex
CREATE UNIQUE INDEX "athletes_fiscal_code_key" ON "athletes"("fiscal_code");

-- CreateIndex
CREATE INDEX "athletes_last_name_first_name_idx" ON "athletes"("last_name", "first_name");

-- CreateIndex
CREATE INDEX "athletes_status_idx" ON "athletes"("status");

-- CreateIndex
CREATE INDEX "athletes_fiscal_code_idx" ON "athletes"("fiscal_code");

-- CreateIndex
CREATE INDEX "athlete_status_history_athlete_id_idx" ON "athlete_status_history"("athlete_id");

-- CreateIndex
CREATE UNIQUE INDEX "parents_user_id_key" ON "parents"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "parents_fiscal_code_key" ON "parents"("fiscal_code");

-- CreateIndex
CREATE INDEX "parents_email_idx" ON "parents"("email");

-- CreateIndex
CREATE INDEX "parents_last_name_first_name_idx" ON "parents"("last_name", "first_name");

-- CreateIndex
CREATE INDEX "athlete_parents_athlete_id_idx" ON "athlete_parents"("athlete_id");

-- CreateIndex
CREATE INDEX "athlete_parents_parent_id_idx" ON "athlete_parents"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "athlete_parents_athlete_id_parent_id_key" ON "athlete_parents"("athlete_id", "parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_user_id_key" ON "teachers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_fiscal_code_key" ON "teachers"("fiscal_code");

-- CreateIndex
CREATE INDEX "course_enrollments_course_id_academic_year_id_idx" ON "course_enrollments"("course_id", "academic_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_enrollments_athlete_id_course_id_academic_year_id_key" ON "course_enrollments"("athlete_id", "course_id", "academic_year_id");

-- CreateIndex
CREATE INDEX "lessons_date_status_idx" ON "lessons"("date", "status");

-- CreateIndex
CREATE INDEX "attendances_athlete_id_idx" ON "attendances"("athlete_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_lesson_id_athlete_id_key" ON "attendances"("lesson_id", "athlete_id");

-- CreateIndex
CREATE INDEX "stages_date_idx" ON "stages"("date");

-- CreateIndex
CREATE UNIQUE INDEX "stage_enrollments_payment_id_key" ON "stage_enrollments"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "stage_enrollments_stage_id_athlete_id_key" ON "stage_enrollments"("stage_id", "athlete_id");

-- CreateIndex
CREATE UNIQUE INDEX "showcases_academic_year_id_key" ON "showcases"("academic_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "showcase_participations_showcase_id_athlete_id_key" ON "showcase_participations"("showcase_id", "athlete_id");

-- CreateIndex
CREATE UNIQUE INDEX "costume_assignments_payment_id_key" ON "costume_assignments"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "costume_assignments_costume_id_participation_id_key" ON "costume_assignments"("costume_id", "participation_id");

-- CreateIndex
CREATE INDEX "payments_athlete_id_payment_date_idx" ON "payments"("athlete_id", "payment_date");

-- CreateIndex
CREATE INDEX "payments_academic_year_id_status_idx" ON "payments"("academic_year_id", "status");

-- CreateIndex
CREATE INDEX "payments_fiscal_year_id_status_idx" ON "payments"("fiscal_year_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_compensation_id_key" ON "expenses"("compensation_id");

-- CreateIndex
CREATE INDEX "expenses_fiscal_year_id_type_idx" ON "expenses"("fiscal_year_id", "type");

-- CreateIndex
CREATE INDEX "expenses_expense_date_idx" ON "expenses"("expense_date");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_compensations_receipt_number_key" ON "teacher_compensations"("receipt_number");

-- CreateIndex
CREATE INDEX "teacher_compensations_teacher_id_fiscal_year_id_idx" ON "teacher_compensations"("teacher_id", "fiscal_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_payment_id_key" ON "receipts"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_receipt_number_key" ON "receipts"("receipt_number");

-- CreateIndex
CREATE INDEX "receipts_receipt_number_idx" ON "receipts"("receipt_number");

-- CreateIndex
CREATE INDEX "receipts_category_issue_date_idx" ON "receipts"("category", "issue_date");

-- CreateIndex
CREATE INDEX "medical_certificates_athlete_id_expiry_date_idx" ON "medical_certificates"("athlete_id", "expiry_date");

-- CreateIndex
CREATE INDEX "insurances_athlete_id_idx" ON "insurances"("athlete_id");

-- CreateIndex
CREATE INDEX "affiliations_status_idx" ON "affiliations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "affiliations_athlete_id_entity_card_year_key" ON "affiliations"("athlete_id", "entity", "card_year");

-- CreateIndex
CREATE INDEX "consents_athlete_id_type_idx" ON "consents"("athlete_id", "type");

-- CreateIndex
CREATE INDEX "consents_parent_id_type_idx" ON "consents"("parent_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "legal_documents_type_version_key" ON "legal_documents"("type", "version");

-- CreateIndex
CREATE INDEX "documents_athlete_id_type_idx" ON "documents"("athlete_id", "type");

-- CreateIndex
CREATE INDEX "email_logs_to_email_created_at_idx" ON "email_logs"("to_email", "created_at");

-- CreateIndex
CREATE INDEX "email_logs_type_status_idx" ON "email_logs"("type", "status");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "athlete_status_history" ADD CONSTRAINT "athlete_status_history_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parents" ADD CONSTRAINT "parents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_parents" ADD CONSTRAINT "athlete_parents_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_parents" ADD CONSTRAINT "athlete_parents_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_schedules" ADD CONSTRAINT "course_schedules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "course_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stages" ADD CONSTRAINT "stages_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_enrollments" ADD CONSTRAINT "stage_enrollments_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_enrollments" ADD CONSTRAINT "stage_enrollments_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_enrollments" ADD CONSTRAINT "stage_enrollments_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "showcases" ADD CONSTRAINT "showcases_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "showcase_participations" ADD CONSTRAINT "showcase_participations_showcase_id_fkey" FOREIGN KEY ("showcase_id") REFERENCES "showcases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "showcase_participations" ADD CONSTRAINT "showcase_participations_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "costumes" ADD CONSTRAINT "costumes_showcase_id_fkey" FOREIGN KEY ("showcase_id") REFERENCES "showcases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "costume_assignments" ADD CONSTRAINT "costume_assignments_costume_id_fkey" FOREIGN KEY ("costume_id") REFERENCES "costumes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "costume_assignments" ADD CONSTRAINT "costume_assignments_participation_id_fkey" FOREIGN KEY ("participation_id") REFERENCES "showcase_participations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "costume_assignments" ADD CONSTRAINT "costume_assignments_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_fiscal_year_id_fkey" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_compensation_id_fkey" FOREIGN KEY ("compensation_id") REFERENCES "teacher_compensations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_fiscal_year_id_fkey" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_compensations" ADD CONSTRAINT "teacher_compensations_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_compensations" ADD CONSTRAINT "teacher_compensations_fiscal_year_id_fkey" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_certificates" ADD CONSTRAINT "medical_certificates_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurances" ADD CONSTRAINT "insurances_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliations" ADD CONSTRAINT "affiliations_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
