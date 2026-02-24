import { MarkdownStream, StreamingMarkdown } from '@ycj3/streaming-markdown'
import { GeminiSSEClient, GeminiSSEClientOptions, GeminiSSEStartInput } from '../services/GeminiSSEClient'
import { QwenSSEClient, QwenSSEClientOptions, QwenSSEStartInput } from '../services/QwenSSEClient'

@Entry
@Component
struct Index {
  private stream: MarkdownStream = new MarkdownStream({ mode: 'word', interval: 20 })
  private geminiClient: GeminiSSEClient | null = null
  private qwenClient: QwenSSEClient | null = null
  private mountedProvider: string = ''

  @State private prompt: string = '请用 Markdown 解释什么是 RAG，并给一个表格示例。'
  @State private provider: string = 'qwen'
  @State private model: string = 'qwen-plus'
  @State private status: string = 'idle'
  @State private errorText: string = ''
  @State private endpointBase: string = 'https://5d0f-103-190-179-39.ngrok-free.app'

  private ensureGeminiClient(): GeminiSSEClient {
    if (this.geminiClient) {
      return this.geminiClient
    }

    const options = new GeminiSSEClientOptions()
    options.endpoint = `${this.endpointBase}/api/gemini/stream`
    options.defaultModel = 'gemini-2.5-flash'
    options.debug = true

    this.geminiClient = new GeminiSSEClient(this.stream, options)
    return this.geminiClient
  }

  private ensureQwenClient(): QwenSSEClient {
    if (this.qwenClient) {
      return this.qwenClient
    }

    const options = new QwenSSEClientOptions()
    options.endpoint = `${this.endpointBase}/api/qwen/stream`
    options.defaultModel = 'qwen-plus'
    options.debug = true

    this.qwenClient = new QwenSSEClient(this.stream, options)
    return this.qwenClient
  }

  private disposeMountedClient() {
    if (this.mountedProvider === 'gemini' && this.geminiClient) {
      this.geminiClient.dispose()
      this.mountedProvider = ''
      return
    }

    if (this.mountedProvider === 'qwen' && this.qwenClient) {
      this.qwenClient.dispose()
      this.mountedProvider = ''
    }
  }

  private ensureMountedProvider(provider: string) {
    if (this.mountedProvider === provider) {
      return
    }

    this.disposeMountedClient()

    const onError = (error: Error) => {
      this.errorText = error.message
      this.status = 'error'
    }

    if (provider === 'gemini') {
      const client = this.ensureGeminiClient()
      client.mount(onError)
      this.mountedProvider = 'gemini'
      return
    }

    const client = this.ensureQwenClient()
    client.mount(onError)
    this.mountedProvider = 'qwen'
  }

  private selectProvider(provider: string) {
    this.provider = provider
    if (provider === 'gemini') {
      this.model = 'gemini-2.5-flash'
      return
    }
    this.model = 'qwen-plus'
  }

  aboutToAppear() {
    this.ensureMountedProvider(this.provider)
  }

  aboutToDisappear() {
    this.disposeMountedClient()
  }

  private async startStream() {
    this.errorText = ''
    this.status = 'streaming'

    try {
      this.ensureMountedProvider(this.provider)

      if (this.provider === 'gemini') {
        const input = new GeminiSSEStartInput()
        input.prompt = this.prompt
        input.model = this.model
        const client = this.ensureGeminiClient()
        await client.start(input)
        return
      }

      const input = new QwenSSEStartInput()
      input.prompt = this.prompt
      input.model = this.model
      const client = this.ensureQwenClient()
      await client.start(input)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.errorText = message
      this.status = 'error'
    }
  }

  build() {
    Column({ space: 10 }) {
      Text(`status: ${this.status}`).fontSize(14)

      if (this.errorText.length > 0) {
        Text(`error: ${this.errorText}`)
          .fontColor('#D32F2F')
          .fontSize(12)
      }

      Row({ space: 8 }) {
        Button(this.provider === 'gemini' ? 'Gemini (selected)' : 'Gemini')
          .onClick(() => {
            this.selectProvider('gemini')
          })

        Button(this.provider === 'qwen' ? 'Qwen (selected)' : 'Qwen')
          .onClick(() => {
            this.selectProvider('qwen')
          })
      }
      .width('100%')

      TextArea({ text: this.model, placeholder: 'model name, e.g. qwen-plus / gemini-2.5-flash' })
        .onChange((value: string) => {
          this.model = value
        })
        .height(52)

      TextArea({ text: this.prompt })
        .onChange((value: string) => {
          this.prompt = value
        })
        .height(120)

      Button(`Send (${this.provider})`)
        .onClick(async () => {
          await this.startStream()
        })

      Scroll() {
        StreamingMarkdown({
          stream: this.stream,
          onComplete: () => {
            this.status = 'completed'
          },
        })
      }
      .layoutWeight(1)
      .width('100%')
      .border({ width: 1, color: '#DDDDDD' })
    }
    .padding(12)
    .width('100%')
    .height('100%')
  }
}
