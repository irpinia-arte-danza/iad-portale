import { notFound } from "next/navigation"

import { getEmailTemplate } from "../actions"
import { TemplateEditor } from "./_components/template-editor"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function EmailTemplateEditPage({ params }: PageProps) {
  const { slug } = await params
  const template = await getEmailTemplate(slug)

  if (!template) {
    notFound()
  }

  return <TemplateEditor template={template} />
}
