import { webview } from '@kit.ArkWeb'

@Component
export struct MathEquationView {
  latex: string = ''
  displayMode: boolean = false

  private webController: webview.WebviewController = new webview.WebviewController()
  @State private pageReady: boolean = false

  aboutToAppear() {
    this.tryRenderEquation()
  }

  private escapeForJavaScript(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '')
  }

  private tryRenderEquation() {
    if (!this.pageReady) {
      return
    }

    const escapedLatex = this.escapeForJavaScript(this.latex)
    const script = `window.renderEquation("${escapedLatex}", ${this.displayMode ? 'true' : 'false'});`
    this.webController.runJavaScript(script).catch((error: Error) => {
      console.error(`[MathEquationView] render equation failed: ${JSON.stringify(error)}`)
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
        this.tryRenderEquation()
      })
      .onAppear(() => {
        this.tryRenderEquation()
      })
      .width('100%')
      .height(this.displayMode ? 96 : 44)
  }
}
