import { redirect } from "next/navigation"

import { requireTeacher } from "@/lib/auth/require-teacher"

import { createOrFindTodayLesson } from "../../_actions/sessions"

type PageProps = {
  searchParams: Promise<{ scheduleId?: string }>
}

// Pagina ponte: crea/recupera Lesson per (scheduleId, oggi) e redirect
// alla pagina sessione [lessonId]. Permette al dashboard di linkare a
// /teacher/sessions/new?scheduleId=X senza dover gestire lo stato lato
// client. Idempotente.
export default async function OpenSessionPage({ searchParams }: PageProps) {
  await requireTeacher()
  const { scheduleId } = await searchParams

  if (!scheduleId) {
    redirect("/teacher/dashboard?error=missing_schedule")
  }

  const result = await createOrFindTodayLesson(scheduleId)
  if (!result.ok || !result.data) {
    redirect(
      `/teacher/dashboard?error=${encodeURIComponent(result.ok ? "no_data" : result.error)}`,
    )
  }

  redirect(`/teacher/sessions/${result.data.lessonId}`)
}
