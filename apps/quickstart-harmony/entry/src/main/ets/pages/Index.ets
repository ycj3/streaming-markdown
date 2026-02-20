import { MarkdownStream, StreamingMarkdown } from '@ycj3/streaming-markdown'
import { GeminiSSEClient, GeminiSSEClientOptions, GeminiSSEStartInput } from '../services/GeminiSSEClient'

@Entry
@Component
struct Index {
  private stream: MarkdownStream = new MarkdownStream({ mode: 'word', interval: 20 })
  private client: GeminiSSEClient | null = null

  @State private prompt: string = '请用 Markdown 解释什么是 RAG，并给一个表格示例。'
  @State private status: string = 'idle'
  @State private errorText: string = ''

  private ensureClient(): GeminiSSEClient {
    if (this.client) {
      return this.client
    }

    const options = new GeminiSSEClientOptions()
    options.endpoint = 'http://192.168.0.102:3000/api/gemini/stream'
    options.defaultModel = 'gemini-3-flash-preview'
    options.debug = false

    this.client = new GeminiSSEClient(this.stream, options)
    return this.client
  }

  aboutToAppear() {
    const client = this.ensureClient()
    client.mount((error: Error) => {
      this.errorText = error.message
      this.status = 'error'
    })
  }

  aboutToDisappear() {
    if (this.client) {
      this.client.dispose()
    }
  }

  private async startStream() {
    this.errorText = ''
    this.status = 'streaming'

    const input = new GeminiSSEStartInput()
    input.prompt = this.prompt

    try {
      const client = this.ensureClient()
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

      TextArea({ text: this.prompt })
        .onChange((value: string) => {
          this.prompt = value
        })
        .height(120)

      Button('Send to Gemini')
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
