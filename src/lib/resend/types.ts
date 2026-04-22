export type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export type EmailSendResult =
  | { success: true; providerId: string }
  | { success: false; error: string };
