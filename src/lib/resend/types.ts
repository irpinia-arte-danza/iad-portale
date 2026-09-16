// Allegato di un'email (es. il PDF archiviato di una ricevuta). Resend
// accetta il contenuto come Buffer o stringa base64; il limite è 40 MB per
// email dopo la codifica base64.
export type EmailAttachment = {
  filename: string;
  content: Buffer;
};

export type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  // Solo per l'invio singolo: l'API batch di Resend non supporta gli allegati
  attachments?: EmailAttachment[];
};

export type EmailSendResult =
  | { success: true; providerId: string }
  | { success: false; error: string; code?: string };
