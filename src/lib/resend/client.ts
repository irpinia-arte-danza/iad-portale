import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not set in environment");
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export const EMAIL_CONFIG = {
  from: "A.S.D. IAD Irpinia Arte Danza <notifiche@irpiniaartedanza.it>",
  replyTo: "info@irpiniaartedanza.it",
} as const;
