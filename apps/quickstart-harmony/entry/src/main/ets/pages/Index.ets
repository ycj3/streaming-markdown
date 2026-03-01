import { MarkdownStream, StreamingMarkdown } from '@ycj3/streaming-markdown'
import type { StreamingMarkdownConfig } from '@ycj3/streaming-markdown'
import { GeminiSSEClient, GeminiSSEClientOptions, GeminiSSEStartInput } from '../services/GeminiSSEClient'
import { QwenSSEClient, QwenSSEClientOptions, QwenSSEStartInput } from '../services/QwenSSEClient'

class ModelSelectOption {
  value: string

  constructor(value: string) {
    this.value = value
  }
}

@Entry
@Component
struct Index {
  private stream: MarkdownStream = new MarkdownStream({ mode: 'word', interval: 20 })
  private geminiClient: GeminiSSEClient | null = null
  private qwenClient: QwenSSEClient | null = null
  private mountedProvider: string = ''

  private readonly qwenModels: string[] = ['qwen-plus', 'qwen-turbo', 'qwen-max']
  private readonly geminiModels: string[] = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']

  @State private page: string = 'home'
  @State private prompt: string = '请用 Markdown 解释什么是 RAG，并给一个表格示例。'
  @State private provider: string = 'qwen'
  @State private model: string = 'qwen-plus'
  @State private stylePreset: string = 'default'
  @State private presetTheme: string = 'light'
  @State private status: string = 'idle'
  @State private errorText: string = ''
  @State private endpointBase: string = 'https://5d0f-103-190-179-39.ngrok-free.app'

  private readonly previewMarkdown: string =
    '# Streaming Markdown Preview\n\n' +
    '这是一段用于样式演示的正文，包含 [链接](https://example.com) 与 `inline code`。\n\n' +
    '## 列表示例\n\n' +
    '- 无序项 A\n' +
    '- 无序项 B\n\n' +
    '1. 有序项 1\n' +
    '2. 有序项 2\n\n' +
    '> 这是一个引用区块，用于观察背景与边框样式。\n\n' +
    '## 代码块\n\n' +
    '```ts\n' +
    'function greet(name: string): string {\n' +
    '  return `hello, ${name}`\n' +
    '}\n' +
    '```\n\n' +
    '---\n\n' +
    '## 表格\n\n' +
    '| Feature | Status |\n' +
    '|---|---|\n' +
    '| heading | ready |\n' +
    '| paragraph | ready |\n'

  private readonly katexDemoMarkdown: string =
    '# KaTeX 数学公式示例\n\n' +
    '这段内容用于演示在流式 Markdown 中混排文本与公式。\n\n' +
    '## 行内公式\n\n' +
    '爱因斯坦质能方程：$E = mc^2$，二次方程求根：$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$。\n\n' +
    '## 块级公式\n\n' +
    '$$\n' +
    '\\int_a^b f(x)\\,dx = F(b) - F(a)\n' +
    '$$\n\n' +
    '$$\n' +
    '\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}\n' +
    '$$\n\n' +
    '## 混排段落\n\n' +
    '在 Transformer 中，注意力计算常写为 $\\mathrm{softmax}(QK^T/\\sqrt{d_k})V$，并与普通 Markdown 的 **加粗**、`inline code`、[链接](https://katex.org) 共存。\n\n' +
    '> 说明：该页面使用项目内置 KaTeX 静态资源进行渲染。\n'

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

  private getCurrentModels(): string[] {
    if (this.provider === 'gemini') {
      return this.geminiModels
    }
    return this.qwenModels
  }

  private getModelSelectOptions(): ModelSelectOption[] {
    const models = this.getCurrentModels()
    const options: ModelSelectOption[] = []
    for (const model of models) {
      options.push(new ModelSelectOption(model))
    }
    return options
  }

  private getModelIndex(): number {
    const models = this.getCurrentModels()
    const index = models.indexOf(this.model)
    if (index >= 0) {
      return index
    }
    return 0
  }

  private selectProvider(provider: string) {
    this.provider = provider
    if (provider === 'gemini') {
      this.model = this.geminiModels[0]
      return
    }
    this.model = this.qwenModels[0]
  }

  private selectModelByIndex(index: number) {
    const models = this.getCurrentModels()
    if (index >= 0 && index < models.length) {
      this.model = models[index]
    }
  }

  aboutToAppear() {
    // Home page; client is mounted lazily when entering AI stream page.
  }

  aboutToDisappear() {
    this.disposeMountedClient()
  }

  private openPage(page: string) {
    this.page = page
    this.errorText = ''
    if (page === 'ai') {
      this.ensureMountedProvider(this.provider)
      return
    }
    if (page === 'preset') {
      this.loadPreviewMarkdown()
      return
    }
    this.disposeMountedClient()
  }

  private backHome() {
    this.page = 'home'
    this.errorText = ''
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

  private getPresetConfig(preset: string): StreamingMarkdownConfig {
    const isDarkTheme = this.presetTheme === 'dark'

    if (preset === 'article') {
      if (isDarkTheme) {
        return {
          heading: { sizes: [46, 40, 34, 28, 24, 20], topSpacing: 26, bottomSpacing: 16, color: '#F8FAFC' },
          paragraph: { fontSize: 22, lineHeight: 40, color: '#E2E8F0', bottomSpacing: 20 },
          list: { fontSize: 22, lineHeight: 40, itemBottomSpacing: 14, color: '#E2E8F0' },
          blockquote: { bgColor: '#1E293B', borderColor: '#F59E0B', textColor: '#FDE68A', bottomSpacing: 16 },
          codeBlock: { radius: 14, borderColor: '#F59E0B', topSpacing: 26, bottomSpacing: 26 },
          table: { headerBgColor: '#3F2D09', borderColor: '#F59E0B', stripeBgColor: '#1F2937', cellFontSize: 18, topSpacing: 24, bottomSpacing: 24 },
          horizontalRule: { color: '#F59E0B', topSpacing: 24, bottomSpacing: 24 },
          inline: { linkColor: '#FBBF24', codeTextColor: '#FCA5A5', codeBgColor: '#374151', mathTextColor: '#FDE68A', mathBgColor: '#292524' },
          layout: { contentPadding: { left: 20, right: 20, top: 12, bottom: 12 } }
        }
      }
      return {
        heading: { sizes: [46, 40, 34, 28, 24, 20], topSpacing: 26, bottomSpacing: 16, color: '#0B1320' },
        paragraph: { fontSize: 22, lineHeight: 40, color: '#1E293B', bottomSpacing: 20 },
        list: { fontSize: 22, lineHeight: 40, itemBottomSpacing: 14, color: '#1E293B' },
        blockquote: { bgColor: '#FFF7E6', borderColor: '#F59E0B', textColor: '#7C2D12', bottomSpacing: 16 },
        codeBlock: { radius: 14, borderColor: '#F59E0B', topSpacing: 26, bottomSpacing: 26 },
        table: { headerBgColor: '#FFECC7', borderColor: '#F59E0B', stripeBgColor: '#FFF7E6', cellFontSize: 18, topSpacing: 24, bottomSpacing: 24 },
        horizontalRule: { color: '#F59E0B', topSpacing: 24, bottomSpacing: 24 },
        inline: { linkColor: '#B45309', codeTextColor: '#991B1B', codeBgColor: '#FFFBEB', mathTextColor: '#92400E', mathBgColor: '#FFF7ED' },
        layout: { contentPadding: { left: 20, right: 20, top: 12, bottom: 12 } }
      }
    }

    if (preset === 'technical') {
      if (isDarkTheme) {
        return {
          heading: { sizes: [22, 19, 17, 15, 13, 12], color: '#E2E8F0', topSpacing: 6, bottomSpacing: 4 },
          paragraph: { fontSize: 12, lineHeight: 16, color: '#CBD5E1', bottomSpacing: 4 },
          list: { fontSize: 12, lineHeight: 16, itemBottomSpacing: 1, color: '#CBD5E1' },
          blockquote: { bgColor: '#0F172A', borderColor: '#38BDF8', textColor: '#93C5FD', bottomSpacing: 6 },
          codeBlock: { radius: 2, borderColor: '#38BDF8', topSpacing: 6, bottomSpacing: 6 },
          table: { headerBgColor: '#082F49', borderColor: '#38BDF8', stripeBgColor: '#0B253A', cellFontSize: 11, topSpacing: 6, bottomSpacing: 6 },
          horizontalRule: { color: '#38BDF8', topSpacing: 6, bottomSpacing: 6 },
          inline: { linkColor: '#22D3EE', codeTextColor: '#FCA5A5', codeBgColor: '#1E293B', mathTextColor: '#67E8F9', mathBgColor: '#0F172A', monoFontFamily: 'monospace' },
          layout: { contentPadding: { left: 6, right: 6, top: 4, bottom: 4 } }
        }
      }
      return {
        heading: { sizes: [22, 19, 17, 15, 13, 12], color: '#0F172A', topSpacing: 6, bottomSpacing: 4 },
        paragraph: { fontSize: 12, lineHeight: 16, color: '#111827', bottomSpacing: 4 },
        list: { fontSize: 12, lineHeight: 16, itemBottomSpacing: 1, color: '#111827' },
        blockquote: { bgColor: '#EAF4FF', borderColor: '#2563EB', textColor: '#1E3A8A', bottomSpacing: 6 },
        codeBlock: { radius: 2, borderColor: '#2563EB', topSpacing: 6, bottomSpacing: 6 },
        table: { headerBgColor: '#DBEAFE', borderColor: '#2563EB', stripeBgColor: '#F1F5F9', cellFontSize: 11, topSpacing: 6, bottomSpacing: 6 },
        horizontalRule: { color: '#2563EB', topSpacing: 6, bottomSpacing: 6 },
        inline: { linkColor: '#1D4ED8', codeTextColor: '#B91C1C', codeBgColor: '#E2E8F0', mathTextColor: '#0C4A6E', mathBgColor: '#E0F2FE', monoFontFamily: 'monospace' },
        layout: { contentPadding: { left: 6, right: 6, top: 4, bottom: 4 } }
      }
    }

    if (isDarkTheme) {
      return {
        heading: { sizes: [32, 28, 23, 19, 17, 15], color: '#E5E7EB' },
        paragraph: { fontSize: 16, lineHeight: 25, color: '#D1D5DB', bottomSpacing: 8 },
        list: { fontSize: 16, lineHeight: 25, itemBottomSpacing: 4, color: '#D1D5DB' },
        blockquote: { bgColor: '#1F2937', borderColor: '#6B7280', textColor: '#E5E7EB' },
        codeBlock: { radius: 10, borderColor: '#6B7280' },
        table: { headerBgColor: '#374151', borderColor: '#6B7280', stripeBgColor: '#1F2937', cellFontSize: 14 },
        horizontalRule: { color: '#6B7280' },
        inline: { linkColor: '#93C5FD', codeTextColor: '#FCA5A5', codeBgColor: '#374151' },
        layout: { contentPadding: { left: 10, right: 10, top: 6, bottom: 6 } }
      }
    }

    return {
      heading: { sizes: [32, 28, 23, 19, 17, 15], color: '#1A1A1A' },
      paragraph: { fontSize: 16, lineHeight: 25, color: '#333333', bottomSpacing: 8 },
      list: { fontSize: 16, lineHeight: 25, itemBottomSpacing: 4, color: '#333333' },
      blockquote: { bgColor: '#F8F8F8', borderColor: '#DADADA', textColor: '#555555' },
      codeBlock: { radius: 10, borderColor: '#DADADA' },
      table: { headerBgColor: '#F2F2F2', borderColor: '#DCDCDC', stripeBgColor: '#FAFAFA', cellFontSize: 14 },
      horizontalRule: { color: '#DADADA' },
      inline: { linkColor: '#1D4ED8', codeTextColor: '#C81E1E', codeBgColor: '#F5F5F5' },
      layout: { contentPadding: { left: 10, right: 10, top: 6, bottom: 6 } }
    }
  }

  private switchPreset(preset: string) {
    this.stylePreset = preset
    if (this.page === 'preset') {
      this.loadPreviewMarkdown()
    }
  }

  private switchPresetTheme(theme: string) {
    this.presetTheme = theme
    if (this.page === 'preset') {
      this.loadPreviewMarkdown()
    }
  }

  private loadPreviewMarkdown() {
    this.errorText = ''
    this.status = 'streaming'
    this.stream.reset()
    this.stream.append(this.previewMarkdown)
    this.stream.finish()
  }

  private loadKatexDemoMarkdown() {
    this.errorText = ''
    this.status = 'streaming'
    this.stream.reset()
    this.stream.append(this.katexDemoMarkdown)
    this.stream.finish()
  }

  build() {
    Column({ space: 10 }) {
      if (this.page === 'home') {
        Text('Streaming Markdown QuickStart')
          .fontSize(20)
          .fontWeight(FontWeight.Medium)
          .width('100%')

        Text('请选择演示入口')
          .fontSize(13)
          .fontColor('#666666')
          .width('100%')

        Column({ space: 10 }) {
          Button('AI 真流演示（Provider + Model）')
            .width('100%')
            .height(48)
            .onClick(() => {
              this.openPage('ai')
            })

          Button('StreamingMarkdownConfig 预设演示')
            .width('100%')
            .height(48)
            .onClick(() => {
              this.openPage('preset')
            })
        }
        .width('100%')
      } else if (this.page === 'ai') {
        Row({ space: 8 }) {
          Button('← Back')
            .onClick(() => {
              this.backHome()
            })

          Text('AI 真流演示')
            .fontSize(18)
            .fontWeight(FontWeight.Medium)
        }
        .width('100%')

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

        Column({ space: 6 }) {
          Text('Model')
            .fontSize(12)
            .fontColor('#666666')

          Select(this.getModelSelectOptions())
            .selected(this.getModelIndex())
            .onSelect((index: number) => {
              this.selectModelByIndex(index)
            })
            .width('100%')
        }
        .width('100%')

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
            config: {},
            onComplete: () => {
              this.status = 'completed'
            }
          })
        }
        .layoutWeight(1)
        .width('100%')
        .border({ width: 1, color: '#DDDDDD' })
      } else {
        Row({ space: 8 }) {
          Button('← Back')
            .onClick(() => {
              this.backHome()
            })

          Text('Preset 演示')
            .fontSize(18)
            .fontWeight(FontWeight.Medium)
        }
        .width('100%')

        Row({ space: 8 }) {
          Button(this.stylePreset === 'default' ? '默认（已选）' : '默认')
            .onClick(() => {
              this.switchPreset('default')
            })
          Button(this.stylePreset === 'article' ? '阅读（已选）' : '阅读')
            .onClick(() => {
              this.switchPreset('article')
            })
          Button(this.stylePreset === 'technical' ? '技术（已选）' : '技术')
            .onClick(() => {
              this.switchPreset('technical')
            })
        }
        .width('100%')

        Row({ space: 8 }) {
          Button(this.presetTheme === 'light' ? '浅色（已选）' : '浅色')
            .onClick(() => {
              this.switchPresetTheme('light')
            })
          Button(this.presetTheme === 'dark' ? '深色（已选）' : '深色')
            .onClick(() => {
              this.switchPresetTheme('dark')
            })
        }
        .width('100%')

        Row({ space: 8 }) {
          Button('加载本地 Markdown 预览')
            .layoutWeight(1)
            .onClick(() => {
              this.loadPreviewMarkdown()
            })

          Button('加载 KaTeX 示例')
            .layoutWeight(1)
            .onClick(() => {
              this.loadKatexDemoMarkdown()
            })
        }
        .width('100%')

        Scroll() {
          StreamingMarkdown({
            stream: this.stream,
            config: this.getPresetConfig(this.stylePreset),
            onComplete: () => {
              this.status = 'completed'
            }
          })
        }
        .layoutWeight(1)
        .width('100%')
        .border({ width: 1, color: '#DDDDDD' })
        .backgroundColor(this.presetTheme === 'dark' ? '#0B1220' : '#FFFFFF')
      }
    }
    .padding(12)
    .width('100%')
    .height('100%')
  }
}
