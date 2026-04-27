"use server"

import { revalidatePath } from "next/cache"

import { AttendanceStatus, Prisma } from "@prisma/client"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { requireTeacher } from "@/lib/auth/require-teacher"
import type { ActionResult } from "@/lib/schemas/common"
import { uuidSchema } from "@/lib/schemas/common"

// ─────────────────────────────────────────────────────────────────────
// Helper: verifica che il corso sia tra i corsi assegnati al teacher.
// Usato per ogni mutation per prevenire IDOR cross-teacher.
// ─────────────────────────────────────────────────────────────────────
async function assertTeacherOwnsCourse(
  teacherId: string,
  courseId: string,
): Promise<boolean> {
  const link = await prisma.teacherCourse.findFirst({
    where: { teacherId, courseId },
    select: { id: true },
  })
  return !!link
}

// ─────────────────────────────────────────────────────────────────────
// createOrFindTodayLesson: idempotente, riusa Lesson esistente
// per (scheduleId, today) o ne crea una nuova.
// ─────────────────────────────────────────────────────────────────────
export async function createOrFindTodayLesson(
  scheduleId: string,
): Promise<ActionResult<{ lessonId: string }>> {
  const { teacherId } = await requireTeacher()

  const idParsed = uuidSchema.safeParse(scheduleId)
  if (!idParsed.success) {
    return { ok: false, error: "Identificativo schedule non valido" }
  }

  const schedule = await prisma.courseSchedule.findUnique({
    where: { id: idParsed.data },
    select: {
      id: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      validFrom: true,
      validTo: true,
      courseId: true,
    },
  })

  if (!schedule) {
    return { ok: false, error: "Orario non trovato" }
  }

  // IDOR check
  if (!(await assertTeacherOwnsCourse(teacherId, schedule.courseId))) {
    return { ok: false, error: "Non sei insegnante di questo corso" }
  }

  // Validità schedule alla data di oggi
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  if (
    schedule.validFrom > today ||
    (schedule.validTo && schedule.validTo < today)
  ) {
    return { ok: false, error: "Orario non valido per oggi" }
  }
  if (schedule.dayOfWeek !== new Date().getDay()) {
    return { ok: false, error: "Orario non corrisponde al giorno corrente" }
  }

  // AcademicYear corrente
  const ay = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { id: true },
  })
  if (!ay) {
    return { ok: false, error: "Anno accademico corrente non configurato" }
  }

  // Idempotente: cerca Lesson esistente per (scheduleId, date=today)
  const existing = await prisma.lesson.findFirst({
    where: {
      scheduleId: schedule.id,
      date: today,
    },
    select: { id: true },
  })
  if (existing) {
    return { ok: true, data: { lessonId: existing.id } }
  }

  try {
    const lesson = await prisma.lesson.create({
      data: {
        scheduleId: schedule.id,
        academicYearId: ay.id,
        date: today,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        status: "SCHEDULED",
      },
      select: { id: true },
    })
    revalidatePath("/teacher/dashboard")
    return { ok: true, data: { lessonId: lesson.id } }
  } catch (error) {
    console.error("[teacher session] create lesson failed", error)
    return { ok: false, error: "Errore creazione lezione" }
  }
}

// ─────────────────────────────────────────────────────────────────────
// saveAttendance: batch upsert presenze per una lezione
// ─────────────────────────────────────────────────────────────────────
const attendanceItemSchema = z.object({
  athleteId: z.string().uuid(),
  status: z.nativeEnum(AttendanceStatus),
  notes: z.string().max(500).optional().nullable(),
})

const saveAttendanceSchema = z.object({
  lessonId: z.string().uuid(),
  items: z.array(attendanceItemSchema).max(200),
})

export type AttendanceItem = z.infer<typeof attendanceItemSchema>

export async function saveAttendance(
  values: z.infer<typeof saveAttendanceSchema>,
): Promise<ActionResult> {
  const { userId, teacherId } = await requireTeacher()

  const parsed = saveAttendanceSchema.safeParse(values)
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dati non validi",
    }
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: parsed.data.lessonId },
    select: {
      id: true,
      status: true,
      schedule: { select: { courseId: true } },
    },
  })

  if (!lesson) {
    return { ok: false, error: "Lezione non trovata" }
  }

  // IDOR check: il corso della lezione deve essere assegnato al teacher
  if (!(await assertTeacherOwnsCourse(teacherId, lesson.schedule.courseId))) {
    return { ok: false, error: "Non sei insegnante di questo corso" }
  }

  if (lesson.status === "CANCELLED") {
    return { ok: false, error: "Lezione annullata, non registrabile" }
  }

  // Verifica che gli athleteId siano effettivamente iscritti al corso
  // nell'AY corrente (defense in depth contro athleteId arbitrari)
  const athleteIds = parsed.data.items.map((i) => i.athleteId)
  const validEnrollments = await prisma.courseEnrollment.findMany({
    where: {
      courseId: lesson.schedule.courseId,
      athleteId: { in: athleteIds },
      withdrawalDate: null,
      academicYear: { isCurrent: true },
      athlete: { deletedAt: null },
    },
    select: { athleteId: true },
  })
  const validIds = new Set(validEnrollments.map((e) => e.athleteId))
  const invalidItems = parsed.data.items.filter(
    (i) => !validIds.has(i.athleteId),
  )
  if (invalidItems.length > 0) {
    return {
      ok: false,
      error: `${invalidItems.length} ${invalidItems.length === 1 ? "allieva non iscritta al corso" : "allieve non iscritte al corso"}`,
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of parsed.data.items) {
        await tx.attendance.upsert({
          where: {
            lessonId_athleteId: {
              lessonId: lesson.id,
              athleteId: item.athleteId,
            },
          },
          update: {
            status: item.status,
            notes: item.notes ?? null,
            markedBy: userId,
            markedAt: new Date(),
          },
          create: {
            lessonId: lesson.id,
            athleteId: item.athleteId,
            status: item.status,
            notes: item.notes ?? null,
            markedBy: userId,
          },
        })
      }
      await tx.lesson.update({
        where: { id: lesson.id },
        data: { status: "COMPLETED" },
      })
    })

    revalidatePath(`/teacher/sessions/${lesson.id}`)
    revalidatePath("/teacher/dashboard")
    return { ok: true }
  } catch (error) {
    console.error("[teacher session] save attendance failed", error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        return { ok: false, error: "Riferimento a record inesistente" }
      }
    }
    return { ok: false, error: "Errore salvataggio presenze" }
  }
}
