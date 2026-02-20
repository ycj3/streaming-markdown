import { strict as assert } from 'assert'
import { MarkdownStream } from '../src/main/ets/core/stream'
import { SSEAdapter, SseConnection, SseMessage } from '../src/main/ets/vendor/adapters/sse-adapter'
import { WebSocketAdapter, WebSocketConnection, WebSocketStartRequest } from '../src/main/ets/vendor/adapters/websocket-adapter'
import { openaiLikeProfile } from '../src/main/ets/vendor/profiles/openai-profile'
import { geminiLikeProfile } from '../src/main/ets/vendor/profiles/gemini-profile'
import { bindAdapterToStream } from '../src/main/ets/vendor/wiring'
import { suite, test } from './test-harness'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitFor(predicate: () => boolean, timeoutMs: number = 1500, intervalMs: number = 5): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (predicate()) {
      return
    }
    await sleep(intervalMs)
  }
  throw new Error(`timeout after ${timeoutMs}ms`)
}

class FakeSseConnection implements SseConnection {
  private messageListeners: Array<(message: SseMessage) => void> = []
  private errorListeners: Array<(error: unknown) => void> = []
  closed: boolean = false

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

  emitMessage(data: string): void {
    this.messageListeners.forEach((listener) => listener({ data }))
  }

  emitError(error: unknown): void {
    this.errorListeners.forEach((listener) => listener(error))
  }

  close(): void {
    this.closed = true
  }
}

class FakeWebSocketConnection implements WebSocketConnection {
  private messageListeners: Array<(payload: string) => void> = []
  private errorListeners: Array<(error: unknown) => void> = []
  private closeListeners: Array<() => void> = []
  sentPayloads: string[] = []
  closed: boolean = false

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

  send(payload: string): void {
    this.sentPayloads.push(payload)
  }

  emitMessage(payload: string): void {
    this.messageListeners.forEach((listener) => listener(payload))
  }

  emitError(error: unknown): void {
    this.errorListeners.forEach((listener) => listener(error))
  }

  emitClose(): void {
    this.closeListeners.forEach((listener) => listener())
  }

  close(): void {
    this.closed = true
  }
}

suite('vendor:profile', () => {
  test('openai profile maps delta / done / error', async () => {
    const delta = openaiLikeProfile.extractDelta({
      choices: [{ delta: { content: 'Hello' }, finish_reason: null }],
    })
    assert.equal(delta, 'Hello')

    assert.equal(openaiLikeProfile.isDone('[DONE]'), true)
    assert.equal(openaiLikeProfile.isDone({ choices: [{ finish_reason: 'stop' }] }), true)

    const error = openaiLikeProfile.extractError({ error: { message: 'invalid request' } })
    assert.equal(error?.message, 'invalid request')
  })

  test('gemini profile maps delta / done / error', async () => {
    const delta = geminiLikeProfile.extractDelta({
      candidates: [{ content: { parts: [{ text: 'Hello ' }, { text: 'Gemini' }] }, finishReason: null }],
    })
    assert.equal(delta, 'Hello Gemini')

    assert.equal(geminiLikeProfile.isDone({ candidates: [{ finishReason: 'STOP' }] }), true)
    assert.equal(geminiLikeProfile.isDone({ candidates: [{ finishReason: null }] }), false)

    const error = geminiLikeProfile.extractError({ error: { message: 'permission denied' } })
    assert.equal(error?.message, 'permission denied')
  })
})

suite('vendor:sse-adapter', () => {
  test('sse adapter normalizes events and drives markdown stream', async () => {
    const stream = new MarkdownStream({ mode: 'char', interval: 1 })
    const connection = new FakeSseConnection()
    const adapter = new SSEAdapter(openaiLikeProfile, () => connection)
    const detach = bindAdapterToStream(adapter, stream)

    await adapter.start({})

    connection.emitMessage('{"choices":[{"delta":{"content":"Hi "},"finish_reason":null}]}')
    connection.emitMessage('{"choices":[{"delta":{"content":"there"},"finish_reason":null}]}')
    connection.emitMessage('[DONE]')

    await waitFor(() => stream.getState() === 'completed')
    assert.deepEqual(stream.getBlocks(), [{ id: 0, type: 'paragraph', text: 'Hi there' }])

    detach()
    adapter.stop()
    assert.equal(connection.closed, true)
  })

  test('sse adapter supports gemini-style multi chunk stream and explicit done', async () => {
    const stream = new MarkdownStream({ mode: 'char', interval: 1 })
    const connection = new FakeSseConnection()
    const adapter = new SSEAdapter(geminiLikeProfile, () => connection)
    bindAdapterToStream(adapter, stream)

    await adapter.start({})

    connection.emitMessage('{"candidates":[{"content":{"parts":[{"text":"# RAG\\n\\n"}]},"index":0}]}')
    connection.emitMessage('{"candidates":[{"content":{"parts":[{"text":"RAG 是一种检索增强生成方法。"}]},"index":0}]}')
    connection.emitMessage('{"candidates":[{"finishReason":"STOP","index":0}]}')

    await waitFor(() => stream.getState() === 'completed')
    assert.deepEqual(stream.getBlocks(), [
      { id: 0, type: 'heading', level: 1, text: 'RAG' },
      { id: 1, type: 'paragraph', text: 'RAG 是一种检索增强生成方法。' },
    ])

    adapter.stop()
    assert.equal(connection.closed, true)
  })
})

suite('vendor:websocket-adapter', () => {
  test('websocket adapter supports initial payload and done on close', async () => {
    const stream = new MarkdownStream({ mode: 'char', interval: 1 })
    const connection = new FakeWebSocketConnection()
    const adapter = new WebSocketAdapter(openaiLikeProfile)
    bindAdapterToStream(adapter, stream)

    const request: WebSocketStartRequest = {
      connect: () => connection,
      initialPayload: { model: 'gpt-4o-mini', input: 'Say hi' },
      finishOnClose: true,
    }

    await adapter.start(request)
    assert.equal(connection.sentPayloads.length, 1)

    connection.emitMessage('{"choices":[{"delta":{"content":"hello"},"finish_reason":null}]}')
    connection.emitClose()

    await waitFor(() => stream.getState() === 'completed')
    assert.deepEqual(stream.getBlocks(), [{ id: 0, type: 'paragraph', text: 'hello' }])

    adapter.stop()
    assert.equal(connection.closed, true)
  })
})
