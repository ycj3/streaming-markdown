import { VendorProfile } from '../types'

type JsonLike = Record<string, unknown>

function asObject(value: unknown): JsonLike | null {
  if (typeof value === 'object' && value !== null) {
    return value as JsonLike
  }
  return null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

export const geminiLikeProfile: VendorProfile = {
  name: 'gemini-like',

  extractDelta(rawEvent: unknown): string | null {
    const event = asObject(rawEvent)
    if (!event) {
      return null
    }

    const candidates = asArray(event.candidates)
    const candidate = asObject(candidates[0])
    const content = asObject(candidate?.content)
    const parts = asArray(content?.parts)

    let delta = ''
    for (const item of parts) {
      const part = asObject(item)
      const text = part?.text
      if (typeof text === 'string') {
        delta += text
      }
    }

    return delta.length > 0 ? delta : null
  },

  isDone(rawEvent: unknown): boolean {
    const event = asObject(rawEvent)
    if (!event) {
      return false
    }

    const candidates = asArray(event.candidates)
    const candidate = asObject(candidates[0])
    return candidate?.finishReason != null
  },

  extractError(rawEvent: unknown): Error | null {
    const event = asObject(rawEvent)
    if (!event) {
      return null
    }

    const rawError = asObject(event.error)
    if (!rawError) {
      return null
    }

    const message = rawError.message
    if (typeof message === 'string' && message.length > 0) {
      return new Error(message)
    }

    return new Error('Vendor returned an unknown error')
  },
}
