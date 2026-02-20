import { highlighter, Token, TokenColors } from '../../core/highlighter';

@Component
export struct CodeBlockBody {
  @Prop code: string;
  @Prop language: string = ''

  @Builder
  renderHighlightedCode() {
    // Use Span to render highlighted code
    Text() {
      // Get tokens from highlighter
      ForEach(this.getTokens(), (token: Token, index: number) => {
        Span(token.value)
          .fontColor(TokenColors[token.type])
          .fontFamily('monospace')
          .fontSize(14)
      })
    }
    .width('100%')
  }

  private getTokens(): Token[] {
    return highlighter.highlight(this.code, this.language);
  }

  build() {
    Column() {
      this.renderHighlightedCode()
    }
    .width('100%')
    .padding(16)
    .backgroundColor('#FAFAFA')
  }
}
