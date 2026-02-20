import { SseConnection, SseMessage } from '@ycj3/streaming-markdown'
import { http } from '@kit.NetworkKit'

export class GeminiStreamRequest {
  prompt: string = ''
  model: string = 'gemini-3-flash-preview'
  system: string = ''
}

const DONE_EVENT_JSON = '{"candidates":[{"finishReason":"STOP"}]}'

function logInfo(enabled: boolean, message: string): void {
  if (!enabled) {
    return
  }
  console.info(message)
}

function logError(enabled: boolean, message: string): void {
  if (!enabled) {
    return
  }
  console.error(message)
}

class BackendSseConnection {
  private messageListeners: Array<(message: SseMessage) => void> = []
  private errorListeners: Array<(error: Error) => void> = []
  private requestTask: http.HttpRequest | null = null
  private closed: boolean = false
  private debug: boolean

  constructor(url: string, body: GeminiStreamRequest, debug: boolean) {
    this.debug = debug
    this.start(url, body)
  }

  private start(url: string, body: GeminiStreamRequest): void {
    logInfo(this.debug, `[QuickStart][SSE] request start: ${url}, model=${body.model}`)

    this.requestTask = http.createHttp()

    const options: http.HttpRequestOptions = {
      method: http.RequestMethod.POST,
      header: {
        'Content-Type': 'application/json'
      },
      extraData: JSON.stringify(body),
      expectDataType: http.HttpDataType.STRING,
      readTimeout: 120000,
      connectTimeout: 120000,
      usingCache: false,
    }

    this.requestTask.request(url, options)
      .then((response: http.HttpResponse) => {
        if (this.closed) {
          logInfo(this.debug, '[QuickStart][SSE] request ignored: connection already closed')
          return
        }

        logInfo(this.debug, `[QuickStart][SSE] response code: ${response.responseCode}`)

        if (response.responseCode < 200 || response.responseCode >= 300) {
          this.emitError(new Error(`SSE request failed: ${response.responseCode}`))
          return
        }

        const raw = this.normalizeResponseBody(response.result)
        logInfo(this.debug, `[QuickStart][SSE] raw length: ${raw.length}`)

        if (raw.length === 0) {
          this.emitError(new Error('SSE response is empty'))
          return
        }

        const parsedCount = this.emitDataLines(raw)
        logInfo(this.debug, `[QuickStart][SSE] parsed data lines: ${parsedCount}`)

        // Fallback done marker, guarantees stream completion.
        this.emitMessage({ data: DONE_EVENT_JSON })
      })
      .catch((error: Error) => {
        logError(this.debug, `[QuickStart][SSE] request exception: ${error.message}`)
        this.emitError(new Error(`SSE request failed: ${error.message}`))
      })
  }

  private normalizeResponseBody(result: Object): string {
    if (typeof result === 'string') {
      return result
    }

    try {
      return JSON.stringify(result)
    } catch {
      return ''
    }
  }

  private emitDataLines(raw: string): number {
    const lines = raw.split('\n')
    let emitted = 0

    let i = 0
    while (i < lines.length) {
      const line = lines[i].trim()
      i += 1

      if (!line.startsWith('data:')) {
        continue
      }

      const data = line.substring(5).trim()
      if (data.length === 0) {
        continue
      }

      emitted += 1
      if (emitted <= 3) {
        logInfo(this.debug, `[QuickStart][SSE] data#${emitted} preview=${data.slice(0, 120)}`)
      }
      this.emitMessage({ data })
    }

    if (emitted === 0) {
      const trimmed = raw.trim()
      if (trimmed.length > 0) {
        emitted = 1
        this.emitMessage({ data: trimmed })
      }
    }

    return emitted
  }

  private emitMessage(message: SseMessage): void {
    this.messageListeners.forEach((listener) => {
      listener(message)
    })
  }

  private emitError(error: Error): void {
    this.errorListeners.forEach((listener) => {
      listener(error)
    })
  }

  onMessage(listener: (message: SseMessage) => void): () => void {
    this.messageListeners.push(listener)
    return () => {
      const idx = this.messageListeners.indexOf(listener)
      if (idx >= 0) {
        this.messageListeners.splice(idx, 1)
      }
    }
  }

  onError(listener: (error: Error) => void): () => void {
    this.errorListeners.push(listener)
    return () => {
      const idx = this.errorListeners.indexOf(listener)
      if (idx >= 0) {
        this.errorListeners.splice(idx, 1)
      }
    }
  }

  close(): void {
    this.closed = true

    if (this.requestTask) {
      this.requestTask.destroy()
      this.requestTask = null
    }

    logInfo(this.debug, '[QuickStart][SSE] connection closed')
  }
}

export async function createBackendSseConnection(
  url: string,
  requestBody: GeminiStreamRequest,
  debug: boolean
): Promise<SseConnection> {
  const conn = new BackendSseConnection(url, requestBody, debug)

  const sseConn: SseConnection = {
    onMessage(listener: (message: SseMessage) => void): () => void {
      return conn.onMessage(listener)
    },
    onError(listener): () => void {
      return conn.onError((error: Error) => {
        listener(error)
      })
    },
    close(): void {
      conn.close()
    }
  }

  return sseConn
}
