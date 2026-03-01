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
  @State private contentHeight: number = 88
  private measureTimers: number[] = []
  private lastRenderedPayload: string = ''

  aboutToAppear() {
    this.tryRenderParagraph()
  }

  aboutToDisappear() {
    for (const timer of this.measureTimers) {
      clearTimeout(timer)
    }
    this.measureTimers = []
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
    if (payload === this.lastRenderedPayload) {
      return
    }
    this.lastRenderedPayload = payload

    for (const timer of this.measureTimers) {
      clearTimeout(timer)
    }
    this.measureTimers = []

    const script = `window.renderMixed(${payload});`
    this.webController
      .runJavaScript(script)
      .then(() => {
        this.measureContentHeight(0)
        this.measureContentHeight(120)
      })
      .catch((error: Error) => {
        console.error(`[MathParagraphView] render paragraph failed: ${JSON.stringify(error)}`)
      })
  }

  private parseMeasuredHeight(raw: Object): number {
    const text = String(raw).trim()
    const normalized = text.replace(/^"+|"+$/g, '')
    const parsed = Number(normalized)
    if (!Number.isFinite(parsed)) {
      return 0
    }
    return Math.floor(parsed)
  }

  private updateHeightIfNeeded(nextHeight: number) {
    const minHeight = 72
    const maxHeight = 1200
    const clamped = Math.min(maxHeight, Math.max(minHeight, nextHeight))
    if (Math.abs(this.contentHeight - clamped) >= 2) {
      this.contentHeight = clamped
    }
  }

  private measureContentHeight(delayMs: number) {
    const run = () => {
      if (!this.pageReady) {
        return
      }
      const measureScript =
        `(function(){` +
        `var root=document.getElementById('math-root');` +
        `var rootH=root?Math.ceil(root.getBoundingClientRect().height):0;` +
        `var bodyH=Math.ceil(document.body?document.body.scrollHeight:0);` +
        `var docH=Math.ceil(document.documentElement?document.documentElement.scrollHeight:0);` +
        `return String(Math.max(rootH,bodyH,docH)+8);` +
        `})()`
      this.webController
        .runJavaScript(measureScript)
        .then((value: Object) => {
          const measured = this.parseMeasuredHeight(value)
          if (measured > 0) {
            this.updateHeightIfNeeded(measured)
          }
        })
        .catch((error: Error) => {
          console.error(`[MathParagraphView] measure height failed: ${JSON.stringify(error)}`)
        })
    }

    if (delayMs <= 0) {
      run()
      return
    }
    const timer: number = setTimeout(() => {
      run()
    }, delayMs)
    this.measureTimers.push(timer)
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
      .width('100%')
      .height(this.contentHeight)
  }
}
