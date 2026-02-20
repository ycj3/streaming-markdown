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

export const openaiLikeProfile: VendorProfile = {
  name: 'openai-like',

  extractDelta(rawEvent: unknown): string | null {
    if (typeof rawEvent === 'string') {
      return rawEvent === '[DONE]' ? null : rawEvent
    }

    const event = asObject(rawEvent)
    if (!event) {
      return null
    }

    const choices = asArray(event.choices)
    if (choices.length === 0) {
      return null
    }

    const choice = asObject(choices[0])
    const delta = asObject(choice?.delta)
    if (!delta) {
      return null
    }

    const content = delta.content
    return typeof content === 'string' ? content : null
  },

  isDone(rawEvent: unknown): boolean {
    if (rawEvent === '[DONE]') {
      return true
    }

    const event = asObject(rawEvent)
    if (!event) {
      return false
    }

    const choices = asArray(event.choices)
    const choice = asObject(choices[0])
    return choice?.finish_reason != null
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
