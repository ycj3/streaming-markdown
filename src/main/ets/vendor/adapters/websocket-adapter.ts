import { AdapterBase } from '../adapter-base'
import { emitProfileEvent, parseJsonOrRaw } from '../adapter-utils'
import { VendorAdapter, VendorProfile } from '../types'

export interface WebSocketConnection {
  onMessage(listener: (payload: string) => void): () => void
  onError(listener: (error: unknown) => void): () => void
  onClose(listener: () => void): () => void
  send(payload: string): void
  close(): void
}

export interface WebSocketStartRequest {
  connect: () => Promise<WebSocketConnection> | WebSocketConnection
  initialPayload?: unknown
  finishOnClose?: boolean
}

export class WebSocketAdapter extends AdapterBase implements VendorAdapter {
  private readonly profile: VendorProfile
  private connection: WebSocketConnection | null = null
  private unsubscribe: Array<() => void> = []

  constructor(profile: VendorProfile) {
    super()
    this.profile = profile
  }

  async start(request: unknown): Promise<void> {
    this.stop()
    this.resetDoneState()

    const wsRequest = request as WebSocketStartRequest
    if (!wsRequest || typeof wsRequest.connect !== 'function') {
      throw new Error('WebSocketAdapter.start requires { connect } request')
    }

    const connection = await wsRequest.connect()
    this.connection = connection

    this.unsubscribe = [
      connection.onMessage((payload) => {
        const rawEvent = parseJsonOrRaw(payload)
        emitProfileEvent(rawEvent, this.profile, (event) => this.emit(event))
      }),
      connection.onError((error) => {
        const normalizedError = error instanceof Error ? error : new Error(String(error))
        this.emit({ type: 'error', error: normalizedError })
      }),
      connection.onClose(() => {
        if (wsRequest.finishOnClose !== false) {
          this.emit({ type: 'done' })
        }
      }),
    ]

    if (typeof wsRequest.initialPayload !== 'undefined') {
      connection.send(JSON.stringify(wsRequest.initialPayload))
    }
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
