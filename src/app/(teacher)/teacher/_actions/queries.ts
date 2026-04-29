import "server-only"

import { prisma } from "@/lib/prisma"

// Tutte le query sono filtrate per teacherId tramite TeacherCourse M2M.
// Insegnante vede SOLO i corsi assegnati (no fee, no finanze, no altri corsi).

export async function getTeacherProfile(teacherId: string) {
  return prisma.teacher.findUnique({
    where: { id: teacherId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  })
}

export async function getMyCourses(teacherId: string) {
  // Corsi M2M dell'insegnante. Esclude monthlyFeeCents/trimesterFeeCents
  // (no finanze a teacher). Include count allieve attive AY corrente.
  const links = await prisma.teacherCourse.findMany({
    where: {
      teacher: { id: teacherId, deletedAt: null },
      course: { deletedAt: null },
    },
    select: {
      isPrimary: true,
      course: {
        select: {
          id: true,
          name: true,
          type: true,
          isActive: true,
          schedules: {
            where: {
              OR: [{ validTo: null }, { validTo: { gte: new Date() } }],
            },
            select: {
              id: true,
              dayOfWeek: true,
              startTime: true,
              endTime: true,
              location: true,
            },
            orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
          },
          _count: {
            select: {
              enrollments: {
                where: {
                  withdrawalDate: null,
                  academicYear: { isCurrent: true },
                  athlete: { deletedAt: null },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { course: { name: "asc" } },
  })

  return links
    .filter((l) => l.course.isActive)
    .map((l) => ({
      isPrimary: l.isPrimary,
      id: l.course.id,
      name: l.course.name,
      type: l.course.type,
      schedules: l.course.schedules,
      activeEnrollments: l.course._count.enrollments,
    }))
}

export type TeacherCourseSummary = Awaited<
  ReturnType<typeof getMyCourses>
>[number]

function startOfDayUtc(d: Date): Date {
  const x = new Date(d)
  x.setUTCHours(0, 0, 0, 0)
  return x
}

function endOfDayUtc(d: Date): Date {
  const x = new Date(d)
  x.setUTCHours(23, 59, 59, 999)
  return x
}

export async function getTodayLessons(teacherId: string) {
  // Lezioni del giorno per i corsi del teacher. Match via Lesson.schedule.course
  const today = new Date()
  const todayStart = startOfDayUtc(today)
  const todayEnd = endOfDayUtc(today)

  const lessons = await prisma.lesson.findMany({
    where: {
      date: { gte: todayStart, lte: todayEnd },
      schedule: {
        course: {
          teacherCourses: { some: { teacherId } },
        },
      },
    },
    select: {
      id: true,
      date: true,
      startTime: true,
      endTime: true,
      status: true,
      schedule: {
        select: {
          location: true,
          course: { select: { id: true, name: true } },
        },
      },
      _count: { select: { attendances: true } },
    },
    orderBy: { startTime: "asc" },
  })

  return lessons
}

export type TodayLesson = Awaited<ReturnType<typeof getTodayLessons>>[number]

export async function getTodaySchedules(teacherId: string) {
  // CourseSchedule che cadono oggi (dayOfWeek match) per i corsi del teacher,
  // validi alla data di oggi. Usato per mostrare "lezione di oggi" anche
  // quando Lesson non è ancora stata creata (insegnante deve aprirla).
  const today = new Date()
  const dow = today.getDay() // 0=Domenica
  return prisma.courseSchedule.findMany({
    where: {
      dayOfWeek: dow,
      validFrom: { lte: today },
      OR: [{ validTo: null }, { validTo: { gte: today } }],
      course: {
        isActive: true,
        teacherCourses: { some: { teacherId } },
      },
    },
    select: {
      id: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      location: true,
      course: { select: { id: true, name: true } },
    },
    orderBy: { startTime: "asc" },
  })
}

export type TodaySchedule = Awaited<
  ReturnType<typeof getTodaySchedules>
>[number]

export async function getUpcomingLessons(teacherId: string, take = 3) {
  // Prossime N lezioni programmate per i corsi del teacher, dopo oggi.
  const tomorrow = new Date()
  tomorrow.setUTCHours(0, 0, 0, 0)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

  return prisma.lesson.findMany({
    where: {
      date: { gte: tomorrow },
      status: "SCHEDULED",
      schedule: {
        course: { teacherCourses: { some: { teacherId } } },
      },
    },
    select: {
      id: true,
      date: true,
      startTime: true,
      endTime: true,
      schedule: {
        select: {
          location: true,
          course: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    take,
  })
}

export type UpcomingLesson = Awaited<
  ReturnType<typeof getUpcomingLessons>
>[number]

export async function getRecentAttendanceStats(teacherId: string) {
  // Stats presenze ultimi 30gg per i corsi del teacher (count per status).
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - 30)

  const grouped = await prisma.attendance.groupBy({
    by: ["status"],
    where: {
      lesson: {
        date: { gte: since },
        schedule: {
          course: { teacherCourses: { some: { teacherId } } },
        },
      },
    },
    _count: { _all: true },
  })

  let present = 0
  let absent = 0
  let justified = 0
  for (const g of grouped) {
    if (g.status === "PRESENT") present = g._count._all
    else if (g.status === "ABSENT") absent = g._count._all
    else if (g.status === "JUSTIFIED") justified = g._count._all
  }
  const total = present + absent + justified
  return { present, absent, justified, total }
}

export type AttendanceStats = Awaited<
  ReturnType<typeof getRecentAttendanceStats>
>
