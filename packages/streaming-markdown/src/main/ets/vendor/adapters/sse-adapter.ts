import { AdapterBase } from '../adapter-base'
import { emitProfileEvent, parseJsonOrRaw } from '../adapter-utils'
import { VendorAdapter, VendorProfile } from '../types'

export type SseMessage = {
  data: string
  event?: string
}

export interface SseConnection {
  onMessage(listener: (message: SseMessage) => void): () => void
  onError(listener: (error: unknown) => void): () => void
  close(): void
}

export type SseConnectionFactory = (request: unknown) => Promise<SseConnection> | SseConnection

export class SSEAdapter extends AdapterBase implements VendorAdapter {
  private readonly profile: VendorProfile
  private readonly createConnection: SseConnectionFactory
  private connection: SseConnection | null = null
  private unsubscribe: Array<() => void> = []

  constructor(profile: VendorProfile, createConnection: SseConnectionFactory) {
    super()
    this.profile = profile
    this.createConnection = createConnection
  }

  async start(request: unknown): Promise<void> {
    this.stop()
    this.resetDoneState()

    const connection = await this.createConnection(request)
    this.connection = connection

    this.unsubscribe = [
      connection.onMessage((message) => {
        const payload = message.data.trim()
        if (payload.length === 0) {
          return
        }
        const rawEvent = parseJsonOrRaw(payload)
        emitProfileEvent(rawEvent, this.profile, (event) => this.emit(event))
      }),
      connection.onError((error) => {
        const normalizedError = error instanceof Error ? error : new Error(String(error))
        this.emit({ type: 'error', error: normalizedError })
      }),
    ]
  }

  stop(): void {
    this.unsubscribe.forEach((off) => off())
    this.unsubscribe = []

    if (this.connection) {
      this.connection.close()
      this.connection = null
    }
  }
}
