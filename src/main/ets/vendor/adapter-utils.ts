import { VendorProfile } from './types'

export function parseJsonOrRaw(payload: string): unknown {
  const text = payload.trim()
  if (text.length === 0) {
    return ''
  }

  try {
    return JSON.parse(text)
  } catch (_error) {
    return text
  }
}

export function emitProfileEvent(
  rawEvent: unknown,
  profile: VendorProfile,
  emit: (event: { type: 'delta'; text: string } | { type: 'done' } | { type: 'error'; error: Error }) => void
): void {
  const error = profile.extractError(rawEvent)
  if (error) {
    emit({ type: 'error', error })
    return
  }

  if (profile.isDone(rawEvent)) {
    emit({ type: 'done' })
    return
  }

  const delta = profile.extractDelta(rawEvent)
  if (delta && delta.length > 0) {
    emit({ type: 'delta', text: delta })
  }
}
