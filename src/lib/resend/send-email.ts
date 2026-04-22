"use server";

import { EMAIL_CONFIG, resend } from "./client";
import type { EmailPayload, EmailSendResult } from "./types";

export async function sendEmail(payload: EmailPayload): Promise<EmailSendResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      replyTo: payload.replyTo ?? EMAIL_CONFIG.replyTo,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data?.id) {
      return { success: false, error: "No provider id returned" };
    }

    return { success: true, providerId: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}
