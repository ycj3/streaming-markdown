import { webview } from '@kit.ArkWeb'
import { parseInlineStyles } from '../core/utils/inline-style-parser'
import { TextSegment } from '../core/protocol'

class RenderSegment {
  type: 'text' | 'math' = 'text'
  content: string = ''
  isMathDisplay: boolean = false
  isBold: boolean = false
  isItalic: boolean = false
  isStrikethrough: boolean = false
  isCode: boolean = false
  isLink: boolean = false
  linkUrl: string = ''
}

@Component
export struct MathParagraphView {
  text: string = ''

  private webController: webview.WebviewController = new webview.WebviewController()
  @State private pageReady: boolean = false

  aboutToAppear() {
    this.tryRenderParagraph()
  }

  private toRenderSegments(text: string): RenderSegment[] {
    const segments: TextSegment[] = parseInlineStyles(text)
    const result: RenderSegment[] = []
    for (const seg of segments) {
      const item = new RenderSegment()
      item.type = seg.isMath ? 'math' : 'text'
      item.content = seg.isMath ? (seg.rawContent || seg.content) : seg.content
      item.isMathDisplay = seg.isMathDisplay
      item.isBold = seg.isBold
      item.isItalic = seg.isItalic
      item.isStrikethrough = seg.isStrikethrough
      item.isCode = seg.isCode
      item.isLink = seg.isLink
      item.linkUrl = seg.linkUrl || ''
      result.push(item)
    }
    return result
  }

  private tryRenderParagraph() {
    if (!this.pageReady) {
      return
    }
    const payload = JSON.stringify(this.toRenderSegments(this.text))
    const script = `window.renderMixed(${payload});`
    this.webController.runJavaScript(script).catch((error: Error) => {
      console.error(`[MathParagraphView] render paragraph failed: ${JSON.stringify(error)}`)
    })
  }

  build() {
    Web({
      src: $rawfile('katex_renderer.html'),
      controller: this.webController
    })
      .javaScriptAccess(true)
      .backgroundColor(Color.Transparent)
      .onPageEnd(() => {
        this.pageReady = true
        this.tryRenderParagraph()
      })
      .onAppear(() => {
        this.tryRenderParagraph()
      })
      .width('100%')
      .height(220)
  }
}
