-- AlterEnum
ALTER TYPE "AttendanceStatus" ADD VALUE 'JUSTIFIED';

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'INVITE_TEACHER';

-- CreateTable
CREATE TABLE "teacher_courses" (
    "id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_courses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teacher_courses_course_id_idx" ON "teacher_courses"("course_id");

-- CreateIndex
CREATE INDEX "teacher_courses_teacher_id_idx" ON "teacher_courses"("teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_courses_teacher_id_course_id_key" ON "teacher_courses"("teacher_id", "course_id");

-- AddForeignKey
ALTER TABLE "teacher_courses" ADD CONSTRAINT "teacher_courses_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_courses" ADD CONSTRAINT "teacher_courses_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Sprint 5 data migration: backfill TeacherCourse da Course.teacherId
-- legacy. Ogni corso con teacher assegnato → 1 row in teacher_courses
-- con isPrimary=true. Course.teacherId resta valorizzato (deprecated,
-- drop futuro batch — vedi §17.23 docs/gotchas.md).
INSERT INTO "teacher_courses" ("id", "teacher_id", "course_id", "is_primary", "created_at")
SELECT
  gen_random_uuid(),
  "teacher_id",
  "id",
  true,
  now()
FROM "courses"
WHERE "teacher_id" IS NOT NULL
ON CONFLICT ("teacher_id", "course_id") DO NOTHING;
