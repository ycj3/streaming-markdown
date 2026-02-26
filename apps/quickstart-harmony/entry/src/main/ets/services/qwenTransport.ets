import { SseConnection, SseMessage } from '@ycj3/streaming-markdown'
import { http } from '@kit.NetworkKit'

export class QwenStreamRequest {
  prompt: string = ''
  model: string = 'qwen-plus'
  system: string = ''
}

const DONE_EVENT_JSON = '[DONE]'

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

  private requestStartAtMs: number = 0
  private firstChunkAtMs: number = -1
  private firstEmitAtMs: number = -1
  private streamedDataLines: number = 0
  private streamBuffer: string = ''
  private streamEventDataLines: string[] = []
  private streamRawBody: string = ''
  private doneEmitted: boolean = false
  private streamDoneHandled: boolean = false
  private utf8TailBytes: number[] = []
  constructor(url: string, body: QwenStreamRequest, debug: boolean) {
    this.debug = debug
    this.start(url, body)
  }

  private start(url: string, body: QwenStreamRequest): void {
    this.requestStartAtMs = Date.now()
    logInfo(this.debug, `[QuickStart][SSE] request start: ${url}, model=${body.model}`)

    this.requestTask = http.createHttp()
    this.attachStreamingListeners()

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

    this.requestTask.requestInStream(url, options)
      .then((responseCode: number) => {
        if (this.closed) {
          logInfo(this.debug, '[QuickStart][SSE] request ignored: connection already closed')
          return
        }

        logInfo(this.debug, `[QuickStart][SSE] response code: ${responseCode}`)
        if (responseCode < 200 || responseCode >= 300) {
          this.emitError(new Error(`SSE request failed: ${responseCode}`))
          return
        }

        if (!this.streamDoneHandled) {
          this.handleStreamDone('requestInStream')
          return
        }
      })
      .catch((error: Error) => {
        logError(this.debug, `[QuickStart][SSE] request exception: ${error.message}`)
        this.emitError(new Error(`SSE request failed: ${error.message}`))
      })
  }

  private attachStreamingListeners(): void {
    if (!this.requestTask) {
      return
    }

    try {
      logInfo(this.debug, '[QuickStart][SSE] attaching dataReceive/dataEnd listeners')
      this.requestTask.on('dataReceive', (payload: ArrayBuffer) => {
        if (this.closed) {
          return
        }

        const chunk = this.decodeChunk(payload)
        if (chunk.length === 0) {
          return
        }

        if (this.firstChunkAtMs < 0) {
          this.firstChunkAtMs = Date.now()
          logInfo(this.debug, `[QuickStart][SSE] first chunk at +${this.firstChunkAtMs - this.requestStartAtMs}ms`)
        }

        this.streamRawBody += chunk
        this.consumeSseChunk(chunk)
      })

      this.requestTask.on('dataEnd', () => {
        if (this.closed) {
          return
        }

        this.handleStreamDone('dataEnd')
      })
      logInfo(this.debug, '[QuickStart][SSE] stream listeners attached')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logInfo(this.debug, `[QuickStart][SSE] attach stream listeners failed: ${message}`)
    }
  }

  private handleStreamDone(source: string): void {
    if (this.streamDoneHandled) {
      return
    }
    this.streamDoneHandled = true

    const decoderTailText = this.flushUtf8TailBytes()
    if (decoderTailText.length > 0) {
      this.streamRawBody += decoderTailText
      this.consumeSseChunk(decoderTailText)
    }

    this.flushStreamBufferTail()
    this.flushPendingEvent()

    if (this.streamedDataLines === 0) {
      const trimmed = this.streamRawBody.trim()
      if (trimmed.length > 0) {
        this.streamedDataLines = 1
        this.emitFirstEmitMetricIfNeeded()
        this.emitMessage({ data: trimmed })
      }
    }

    logInfo(this.debug, `[QuickStart][SSE] stream done (${source}), emitted=${this.streamedDataLines}`)
    this.emitDoneMarker()
  }

  private consumeSseChunk(chunk: string): void {
    this.streamBuffer += chunk

    let newlineIndex = this.streamBuffer.indexOf('\n')
    while (newlineIndex >= 0) {
      let line = this.streamBuffer.substring(0, newlineIndex)
      this.streamBuffer = this.streamBuffer.substring(newlineIndex + 1)

      if (line.endsWith('\r')) {
        line = line.substring(0, line.length - 1)
      }

      this.consumeSseLine(line)
      newlineIndex = this.streamBuffer.indexOf('\n')
    }
  }

  private consumeSseLine(line: string): void {
    const trimmed = line.trim()
    if (trimmed.length === 0) {
      this.flushPendingEvent()
      return
    }

    if (!trimmed.startsWith('data:')) {
      return
    }

    const payload = trimmed.substring(5).trim()
    if (payload.length === 0) {
      return
    }

    this.streamEventDataLines.push(payload)
  }

  private flushPendingEvent(): void {
    if (this.streamEventDataLines.length === 0) {
      return
    }

    const data = this.streamEventDataLines.join('\n')
    this.streamEventDataLines = []

    this.streamedDataLines += 1
    this.emitFirstEmitMetricIfNeeded()

    if (this.streamedDataLines <= 3) {
      logInfo(this.debug, `[QuickStart][SSE] data#${this.streamedDataLines} preview=${data.slice(0, 120)}`)
    }

    this.emitMessage({ data })
  }

  private flushStreamBufferTail(): void {
    if (this.streamBuffer.length === 0) {
      return
    }

    let line = this.streamBuffer
    this.streamBuffer = ''
    if (line.endsWith('\r')) {
      line = line.substring(0, line.length - 1)
    }
    this.consumeSseLine(line)
  }

  private emitFirstEmitMetricIfNeeded(): void {
    if (this.firstEmitAtMs >= 0) {
      return
    }

    this.firstEmitAtMs = Date.now()
    logInfo(this.debug, `[QuickStart][SSE] first emit at +${this.firstEmitAtMs - this.requestStartAtMs}ms`)
  }

  private emitDoneMarker(): void {
    if (this.doneEmitted) {
      return
    }
    this.doneEmitted = true
    this.emitMessage({ data: DONE_EVENT_JSON })
  }

  private decodeChunk(payload?: Object): string {
    if (!payload) {
      return ''
    }

    if (typeof payload === 'string') {
      return payload
    }

    if (typeof ArrayBuffer !== 'undefined' && payload instanceof ArrayBuffer) {
      const bytes = new Uint8Array(payload)
      return this.decodeUtf8Bytes(bytes)
    }

    return ''
  }

  private flushUtf8TailBytes(): string {
    if (this.utf8TailBytes.length === 0) {
      return ''
    }

    this.utf8TailBytes = []
    return '\uFFFD'
  }

  private decodeUtf8Bytes(bytes: Uint8Array): string {
    const merged: number[] = []
    let i = 0
    while (i < this.utf8TailBytes.length) {
      merged.push(this.utf8TailBytes[i])
      i += 1
    }
    i = 0
    while (i < bytes.length) {
      merged.push(bytes[i])
      i += 1
    }
    this.utf8TailBytes = []

    let out = ''
    i = 0
    while (i < merged.length) {
      const b1 = merged[i]
      if (b1 <= 0x7F) {
        out += String.fromCharCode(b1)
        i += 1
        continue
      }

      let need = 0
      let codepoint = 0
      if (b1 >= 0xC2 && b1 <= 0xDF) {
        need = 2
        codepoint = b1 & 0x1F
      } else if (b1 >= 0xE0 && b1 <= 0xEF) {
        need = 3
        codepoint = b1 & 0x0F
      } else if (b1 >= 0xF0 && b1 <= 0xF4) {
        need = 4
        codepoint = b1 & 0x07
      } else {
        out += '\uFFFD'
        i += 1
        continue
      }

      if (i + need > merged.length) {
        while (i < merged.length) {
          this.utf8TailBytes.push(merged[i])
          i += 1
        }
        break
      }

      let j = 1
      let valid = true
      while (j < need) {
        const bj = merged[i + j]
        if ((bj & 0xC0) !== 0x80) {
          valid = false
          break
        }
        codepoint = (codepoint << 6) | (bj & 0x3F)
        j += 1
      }
      if (!valid) {
        out += '\uFFFD'
        i += 1
        continue
      }

      const overlong2 = need === 2 && codepoint < 0x80
      const overlong3 = need === 3 && codepoint < 0x800
      const overlong4 = need === 4 && codepoint < 0x10000
      const surrogate = codepoint >= 0xD800 && codepoint <= 0xDFFF
      const tooLarge = codepoint > 0x10FFFF
      if (overlong2 || overlong3 || overlong4 || surrogate || tooLarge) {
        out += '\uFFFD'
        i += need
        continue
      }

      if (codepoint <= 0xFFFF) {
        out += String.fromCharCode(codepoint)
      } else {
        const normalized = codepoint - 0x10000
        out += String.fromCharCode(0xD800 + (normalized >> 10))
        out += String.fromCharCode(0xDC00 + (normalized & 0x3FF))
      }
      i += need
    }

    return out
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
  requestBody: QwenStreamRequest,
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
