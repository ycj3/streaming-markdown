export type UnifiedEvent =
  | { type: 'delta'; text: string }
  | { type: 'done' }
  | { type: 'error'; error: Error }

export type UnifiedEventListener = (event: UnifiedEvent) => void

export interface VendorAdapter {
  start(request: unknown): Promise<void>
  onEvent(listener: UnifiedEventListener): () => void
  stop(): void
}

export interface VendorProfile {
  name: string
  extractDelta(rawEvent: unknown): string | null
  isDone(rawEvent: unknown): boolean
  extractError(rawEvent: unknown): Error | null
}
