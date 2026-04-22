"use server"

import { EMAIL_CONFIG, resend } from "./client"

export type BatchItem = {
  to: string
  subject: string
  html: string
  text?: string
}

export type BatchItemResult =
  | { success: true; providerId: string }
  | { success: false; error: string }

export type BatchSendResult = {
  results: BatchItemResult[]
  transportError?: string
}

export async function sendBatch(items: BatchItem[]): Promise<BatchSendResult> {
  if (items.length === 0) {
    return { results: [] }
  }

  try {
    const payload = items.map((item) => ({
      from: EMAIL_CONFIG.from,
      to: item.to,
      subject: item.subject,
      html: item.html,
      text: item.text,
      replyTo: EMAIL_CONFIG.replyTo,
    }))

    const response = await resend.batch.send(payload, {
      batchValidation: "permissive",
    })

    if (response.error) {
      return {
        results: items.map(() => ({
          success: false as const,
          error: response.error?.message ?? "Batch send failed",
        })),
        transportError: response.error.message,
      }
    }

    const data = response.data
    if (!data) {
      return {
        results: items.map(() => ({
          success: false as const,
          error: "No data returned from provider",
        })),
        transportError: "Empty response",
      }
    }

    const errorByIndex = new Map<number, string>()
    const permissiveErrors = (data as { errors?: Array<{ index: number; message: string }> }).errors
    if (Array.isArray(permissiveErrors)) {
      for (const err of permissiveErrors) {
        errorByIndex.set(err.index, err.message)
      }
    }

    const successIds = data.data ?? []
    let successCursor = 0

    const results: BatchItemResult[] = items.map((_, idx) => {
      const failureMessage = errorByIndex.get(idx)
      if (failureMessage) {
        return { success: false as const, error: failureMessage }
      }
      const entry = successIds[successCursor++]
      if (!entry?.id) {
        return { success: false as const, error: "Missing provider id" }
      }
      return { success: true as const, providerId: entry.id }
    })

    return { results }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return {
      results: items.map(() => ({
        success: false as const,
        error: message,
      })),
      transportError: message,
    }
  }
}
