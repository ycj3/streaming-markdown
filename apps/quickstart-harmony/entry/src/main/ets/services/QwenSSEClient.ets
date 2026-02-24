import {
  MarkdownStream,
  SSEAdapter,
  openaiLikeProfile,
  bindAdapterToStream,
} from '@ycj3/streaming-markdown'
import type { AdapterStreamBindingOptions, SseConnectionFactory, UnifiedEvent } from '@ycj3/streaming-markdown'
import { createBackendSseConnection, QwenStreamRequest } from './qwenTransport'

export class QwenSSEClientOptions {
  endpoint: string = 'http://127.0.0.1:3000/api/qwen/stream'
  defaultModel: string = 'qwen-plus'
  defaultSystem: string = '你是一个专业助手，输出尽量结构化 Markdown。'
  debug: boolean = false
  finishOnError: boolean = true
}

export class QwenSSEStartInput {
  prompt: string = ''
  model: string = ''
  system: string = ''
}

export class QwenSSEClient {
  private options: QwenSSEClientOptions
  private stream: MarkdownStream
  private adapter: SSEAdapter | null = null
  private detachBinding: (() => void) | null = null
  private detachDebug: (() => void) | null = null
  private pendingRequest: QwenStreamRequest = new QwenStreamRequest()

  constructor(stream: MarkdownStream, options: QwenSSEClientOptions) {
    this.stream = stream
    this.options = options
  }

  mount(onError: (error: Error) => void): void {
    this.dispose()

    const factory: SseConnectionFactory = async () => {
      return createBackendSseConnection(this.options.endpoint, this.pendingRequest, this.options.debug)
    }

    this.adapter = new SSEAdapter(openaiLikeProfile, factory)

    if (this.options.debug) {
      this.detachDebug = this.adapter.onEvent((event: UnifiedEvent) => {
        if (event.type === 'delta') {
          console.info(`[QuickStart][Adapter] delta len=${event.text.length}`)
        } else if (event.type === 'done') {
          console.info('[QuickStart][Adapter] done received')
        } else {
          console.error(`[QuickStart][Adapter] error: ${event.error.message}`)
        }
      })
    }

    const bindOptions: AdapterStreamBindingOptions = {
      onError,
      finishOnError: this.options.finishOnError,
    }

    this.detachBinding = bindAdapterToStream(this.adapter, this.stream, bindOptions)
  }

  async start(input: QwenSSEStartInput): Promise<void> {
    if (!this.adapter) {
      throw new Error('QwenSSEClient is not mounted')
    }

    if (!input.prompt.trim()) {
      throw new Error('prompt is empty')
    }

    const req = new QwenStreamRequest()
    req.prompt = input.prompt
    req.model = input.model.trim().length > 0 ? input.model : this.options.defaultModel
    req.system = input.system.trim().length > 0 ? input.system : this.options.defaultSystem

    this.pendingRequest = req
    this.stream.reset()

    await this.adapter.start('start')
  }

  dispose(): void {
    if (this.detachBinding) {
      this.detachBinding()
      this.detachBinding = null
    }

    if (this.detachDebug) {
      this.detachDebug()
      this.detachDebug = null
    }

    if (this.adapter) {
      this.adapter.stop()
      this.adapter = null
    }
  }
}
