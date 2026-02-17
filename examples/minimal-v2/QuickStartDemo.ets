import {
  MarkdownStream,
  StreamingMarkdown,
  SSEAdapter,
  WebSocketAdapter,
  openaiLikeProfile,
  bindAdapterToStream,
  SseConnection,
  SseMessage,
  WebSocketConnection,
} from '@ycj3/streaming-markdown'

class MockSseConnection implements SseConnection {
  private messageListeners: Array<(message: SseMessage) => void> = []
  private errorListeners: Array<(error: unknown) => void> = []
  private timer: number | undefined
  private cursor: number = 0
  private closed: boolean = false

  onMessage(listener: (message: SseMessage) => void): () => void {
    this.messageListeners.push(listener)
    return () => {
      this.messageListeners = this.messageListeners.filter((item) => item !== listener)
    }
  }

  onError(listener: (error: unknown) => void): () => void {
    this.errorListeners.push(listener)
    return () => {
      this.errorListeners = this.errorListeners.filter((item) => item !== listener)
    }
  }

  startScript(payloads: string[], intervalMs: number): void {
    this.cursor = 0
    const pump = () => {
      if (this.closed || this.cursor >= payloads.length) {
        return
      }
      const data = payloads[this.cursor]
      this.cursor += 1
      this.messageListeners.forEach((listener) => listener({ data }))
      this.timer = setTimeout(pump, intervalMs) as unknown as number
    }
    this.timer = setTimeout(pump, intervalMs) as unknown as number
  }

  close(): void {
    this.closed = true
    if (this.timer !== undefined) {
      clearTimeout(this.timer)
      this.timer = undefined
    }
  }
}

class MockWebSocketConnection implements WebSocketConnection {
  private messageListeners: Array<(payload: string) => void> = []
  private errorListeners: Array<(error: unknown) => void> = []
  private closeListeners: Array<() => void> = []
  private timer: number | undefined
  private cursor: number = 0
  private closed: boolean = false
  private started: boolean = false

  onMessage(listener: (payload: string) => void): () => void {
    this.messageListeners.push(listener)
    return () => {
      this.messageListeners = this.messageListeners.filter((item) => item !== listener)
    }
  }

  onError(listener: (error: unknown) => void): () => void {
    this.errorListeners.push(listener)
    return () => {
      this.errorListeners = this.errorListeners.filter((item) => item !== listener)
    }
  }

  onClose(listener: () => void): () => void {
    this.closeListeners.push(listener)
    return () => {
      this.closeListeners = this.closeListeners.filter((item) => item !== listener)
    }
  }

  send(_payload: string): void {
    if (this.started || this.closed) {
      return
    }
    this.started = true
    const frames = [
      '{"choices":[{"delta":{"content":"# WebSocket Mock\\n\\n"},"finish_reason":null}]}',
      '{"choices":[{"delta":{"content":"连接成功后开始推流。\\n\\n"},"finish_reason":null}]}',
      '{"choices":[{"delta":{"content":"- 由 adapter 自动映射到 append\\n"},"finish_reason":null}]}',
      '{"choices":[{"delta":{"content":"- close 时触发 finish\\n"},"finish_reason":null}]}',
    ]

    const pump = () => {
      if (this.closed || this.cursor >= frames.length) {
        this.closeListeners.forEach((listener) => listener())
        return
      }
      const payload = frames[this.cursor]
      this.cursor += 1
      this.messageListeners.forEach((listener) => listener(payload))
      this.timer = setTimeout(pump, 120) as unknown as number
    }
    this.timer = setTimeout(pump, 120) as unknown as number
  }

  close(): void {
    this.closed = true
    if (this.timer !== undefined) {
      clearTimeout(this.timer)
      this.timer = undefined
    }
  }
}

@Entry
@Component
struct QuickStartDemo {
  private stream: MarkdownStream = new MarkdownStream({ mode: 'word', interval: 20 })
  private stopBinding?: () => void
  private activeAdapter?: { stop(): void }
  private localTimer: number | undefined

  @State private status: string = 'idle'

  aboutToDisappear() {
    this.stopAllInputs()
  }

  private stopAllInputs() {
    if (this.localTimer !== undefined) {
      clearTimeout(this.localTimer)
      this.localTimer = undefined
    }
    if (this.stopBinding) {
      this.stopBinding()
      this.stopBinding = undefined
    }
    if (this.activeAdapter) {
      this.activeAdapter.stop()
      this.activeAdapter = undefined
    }
  }

  private resetForRun(label: string) {
    this.stopAllInputs()
    this.stream.reset()
    this.status = label
  }

  private runLocalMock() {
    this.resetForRun('local-streaming')
    const chunks = [
      '# 本地模拟流\\n\\n',
      '这是最小接入：直接调用 `append`。\\n\\n',
      '- chunk 1\\n',
      '- chunk 2\\n',
      '最后调用 `finish()`。\\n',
    ]
    let idx = 0
    const pump = () => {
      if (idx >= chunks.length) {
        this.stream.finish()
        return
      }
      this.stream.append(chunks[idx])
      idx += 1
      this.localTimer = setTimeout(pump, 120) as unknown as number
    }
    pump()
  }

  private runSseMock() {
    this.resetForRun('sse-streaming')

    const adapter = new SSEAdapter(openaiLikeProfile, async () => {
      const conn = new MockSseConnection()
      conn.startScript([
        '{"choices":[{"delta":{"content":"# SSE Mock\\n\\n"},"finish_reason":null}]}',
        '{"choices":[{"delta":{"content":"SSE event data -> profile -> append。\\n\\n"},"finish_reason":null}]}',
        '{"choices":[{"delta":{"content":"可以先用 mock 验证渲染链路。\\n"},"finish_reason":null}]}',
        '[DONE]',
      ], 120)
      return conn
    })

    this.stopBinding = bindAdapterToStream(adapter, this.stream)
    this.activeAdapter = adapter
    void adapter.start({})
  }

  private runWebSocketMock() {
    this.resetForRun('websocket-streaming')

    const adapter = new WebSocketAdapter(openaiLikeProfile)
    this.stopBinding = bindAdapterToStream(adapter, this.stream)
    this.activeAdapter = adapter

    void adapter.start({
      connect: async () => new MockWebSocketConnection(),
      initialPayload: { model: 'demo', input: 'start' },
      finishOnClose: true,
    })
  }

  build() {
    Column({ space: 10 }) {
      Text(`status: ${this.status}`).fontSize(14)

      Row({ space: 8 }) {
        Button('本地模拟流').onClick(() => this.runLocalMock())
        Button('SSE(mock)').onClick(() => this.runSseMock())
        Button('WebSocket(mock)').onClick(() => this.runWebSocketMock())
      }

      Scroll() {
        StreamingMarkdown({
          stream: this.stream,
          onComplete: () => {
            this.status = 'completed'
          },
        })
      }
      .width('100%')
      .layoutWeight(1)
      .backgroundColor('#ffffff')
      .border({ width: 1, color: '#dddddd' })
    }
    .padding(12)
    .width('100%')
    .height('100%')
  }
}
