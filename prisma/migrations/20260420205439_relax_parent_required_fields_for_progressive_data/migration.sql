-- AlterTable
ALTER TABLE "parents" ALTER COLUMN "fiscal_code" DROP NOT NULL,
ALTER COLUMN "date_of_birth" DROP NOT NULL,
ALTER COLUMN "residence_street" DROP NOT NULL,
ALTER COLUMN "residence_number" DROP NOT NULL,
ALTER COLUMN "residence_city" DROP NOT NULL,
ALTER COLUMN "residence_province" DROP NOT NULL,
ALTER COLUMN "residence_cap" DROP NOT NULL,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL;
