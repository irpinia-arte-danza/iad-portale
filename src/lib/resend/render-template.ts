import { prisma } from "@/lib/prisma";
import { substituteVariables, type TemplateVars } from "./template-vars";

export type RenderedTemplate = {
  slug: string;
  subject: string;
  bodyHtml: string;
  bodyText: string | null;
};

export async function renderTemplate(
  slug: string,
  vars: TemplateVars,
): Promise<RenderedTemplate> {
  const template = await prisma.emailTemplate.findUnique({
    where: { slug },
  });

  if (!template) {
    throw new Error(`EmailTemplate not found: ${slug}`);
  }

  if (!template.isActive) {
    throw new Error(`EmailTemplate is not active: ${slug}`);
  }

  return {
    slug: template.slug,
    subject: substituteVariables(template.subject, vars),
    bodyHtml: substituteVariables(template.bodyHtml, vars),
    bodyText: template.bodyText ? substituteVariables(template.bodyText, vars) : null,
  };
}
