import { Block, CodeBlock, TextSegment, HeadingBlock, ListItemBlock, OrderedListItemBlock, TaskListItemBlock, BlockquoteBlock, HorizontalRuleBlock, TableBlock } from '../core/protocol'
import { CodeBlockHeader } from './code-block/CodeBlockHeader'
import { CodeBlockBody } from './code-block/CodeBlockBody'
import { MathParagraphView } from './MathParagraphView'
import { parseInlineStyles } from '../core/utils/inline-style-parser'
import { StreamingMarkdownResolvedConfig, DEFAULT_STREAMING_MARKDOWN_CONFIG } from './config'
import { common } from '@kit.AbilityKit';
import { BusinessError } from '@kit.BasicServicesKit';

const INLINE_SEGMENT_CACHE_LIMIT = 256
const LIST_MARKER_WIDTH = 28
const inlineSegmentCache: Map<string, TextSegment[]> = new Map()

function buildInlineSegmentCacheKey(block: Block, text: string): string {
  return `${block.id}::${text}`
}

function getCachedSegments(key: string): TextSegment[] | undefined {
  const cached = inlineSegmentCache.get(key)
  if (!cached) {
    return undefined
  }

  // Refresh insertion order to keep this as a tiny LRU cache.
  inlineSegmentCache.delete(key)
  inlineSegmentCache.set(key, cached)
  return cached
}

function setCachedSegments(key: string, segments: TextSegment[]): void {
  inlineSegmentCache.set(key, segments)
  if (inlineSegmentCache.size <= INLINE_SEGMENT_CACHE_LIMIT) {
    return
  }

  const oldestKey = inlineSegmentCache.keys().next().value as string | undefined
  if (oldestKey) {
    inlineSegmentCache.delete(oldestKey)
  }
}

@Component
export struct BlockView {
  @Prop block: Block;
  @Prop config: StreamingMarkdownResolvedConfig = DEFAULT_STREAMING_MARKDOWN_CONFIG;

  // Helper to parse segments from the paragraph text
  parseSegments(text: string): TextSegment[] {
    // Cache invalidation rule:
    // - `block.id` changes for different blocks
    // - `text` changes whenever block content changes
    // So a changed render input naturally misses cache and reparses.
    const cacheKey = buildInlineSegmentCacheKey(this.block, text)
    const cached = getCachedSegments(cacheKey)
    if (cached) {
      return cached
    }

    const parsed = parseInlineStyles(text)
    setCachedSegments(cacheKey, parsed)
    return parsed
  }

  // Open link URL in system browser
  openLink(url: string) {
    const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
    context.openLink(url)
      .then(() => {})
      .catch((error: BusinessError) => {
        console.error('open link failed: ' + JSON.stringify(error));
      });
  }

  private getSegmentFontFamily(seg: TextSegment): string {
    if (seg.isCode || seg.isMath) {
      return this.config.monoFontFamily
    }
    return this.config.fontFamily
  }

  private getSegmentFontColor(seg: TextSegment, defaultColor: string): string {
    if (seg.isCode) {
      return this.config.inlineCodeTextColor
    }
    if (seg.isMath) {
      return this.config.inlineMathTextColor
    }
    if (seg.isLink) {
      return this.config.linkColor
    }
    return defaultColor
  }

  private getSegmentDecorationType(seg: TextSegment): TextDecorationType {
    if (seg.isStrikethrough) {
      return TextDecorationType.LineThrough
    }
    if (seg.isLink) {
      return TextDecorationType.Underline
    }
    return TextDecorationType.None
  }

  private getSegmentFontSize(seg: TextSegment, baseSize: number): number {
    return seg.isMathDisplay ? baseSize + 2 : baseSize
  }

  private getInlineBackground(seg: TextSegment): string | undefined {
    if (seg.isCode) {
      return this.config.inlineCodeBgColor
    }
    if (seg.isMath) {
      return this.config.inlineMathBgColor
    }
    return undefined
  }

  private hasMathSegments(text: string): boolean {
    const segments = this.parseSegments(text)
    for (const seg of segments) {
      if (seg.isMath) {
        return true
      }
    }
    return false
  }

  build() {
    Column() {
      if (this.block.type === 'heading') {
        Text() {
          ForEach(this.parseSegments(this.block.text), (seg: TextSegment) => {
            Span(seg.content)
              .fontSize(this.getSegmentFontSize(seg, this.getHeadingSize((this.block as HeadingBlock).level)))
              .fontWeight(FontWeight.Bold)
              .fontColor(this.getSegmentFontColor(seg, this.config.headingColor))
              .fontFamily(this.getSegmentFontFamily(seg))
              .fontStyle(seg.isItalic ? FontStyle.Italic : FontStyle.Normal)
              .decoration({
                type: this.getSegmentDecorationType(seg),
                color: this.getSegmentFontColor(seg, this.config.headingColor)
              })
              .textBackgroundStyle(this.getInlineBackground(seg) ? { color: this.getInlineBackground(seg), radius: 4 } : undefined)
              .onClick(() => {
                if (seg.isLink && seg.linkUrl) {
                  this.openLink(seg.linkUrl);
                }
              })
          })
        }
        .lineHeight(this.config.lineHeight)
        .width('100%')
        .margin({ top: this.config.spacing.headingTop, bottom: this.config.spacing.headingBottom })
      } else if (this.block.type === 'paragraph') {
        if (this.hasMathSegments(this.block.text)) {
          MathParagraphView({
            text: this.block.text
          })
            .width('100%')
            .margin({ bottom: this.config.spacing.paragraphBottom })
        } else {
          Text() {
            ForEach(this.parseSegments(this.block.text), (seg: TextSegment) => {
              Span(seg.content)
                .fontSize(this.getSegmentFontSize(seg, this.config.baseFontSize))
                .fontFamily(this.getSegmentFontFamily(seg))
                .fontColor(this.getSegmentFontColor(seg, this.config.textColor))
                .fontWeight(seg.isBold ? FontWeight.Bold : FontWeight.Normal)
                .fontStyle(seg.isItalic ? FontStyle.Italic : FontStyle.Normal)
                .decoration({
                  type: this.getSegmentDecorationType(seg),
                  color: this.getSegmentFontColor(seg, this.config.textColor)
                })
                .textBackgroundStyle(this.getInlineBackground(seg) ? { color: this.getInlineBackground(seg), radius: 4 } : undefined)
                .onClick(() => {
                  if (seg.isLink && seg.linkUrl) {
                    this.openLink(seg.linkUrl);
                  }
                })
            })
          }
          .lineHeight(this.config.lineHeight)
          .width('100%')
          .margin({ bottom: this.config.spacing.paragraphBottom })
        }
      } else if (this.block.type === 'code') {
        Column() {
          CodeBlockHeader({
            language: (this.block as CodeBlock).lang || '',
            code: this.block.text
          })
          Divider().color(this.config.tableBorderColor).strokeWidth(1)
          CodeBlockBody({
            code: this.block.text,
            language: (this.block as CodeBlock).lang || ''
          })
        }
        .alignItems(HorizontalAlign.Start)
        .margin({ top: this.config.spacing.codeBlockTop, bottom: this.config.spacing.codeBlockBottom })
        .width('100%')
        .clip(true)
        .borderRadius(this.config.codeBlockRadius)
        .border({ width: 1, color: this.config.codeBlockBorderColor })
      } else if (this.block.type === 'listItem') {
        Row() {
          // Bullet point
          Text('•')
            .fontSize(this.config.baseFontSize)
            .lineHeight(this.config.lineHeight)
            .fontColor(this.config.textColor)
            .width(LIST_MARKER_WIDTH)
            .textAlign(TextAlign.Center)
          
          // List item content with inline styles
          Text() {
            ForEach(this.parseSegments(this.block.text), (seg: TextSegment) => {
              Span(seg.content)
                .fontSize(this.getSegmentFontSize(seg, this.config.baseFontSize))
                .fontFamily(this.getSegmentFontFamily(seg))
                .fontColor(this.getSegmentFontColor(seg, this.config.textColor))
                .fontWeight(seg.isBold ? FontWeight.Bold : FontWeight.Normal)
                .fontStyle(seg.isItalic ? FontStyle.Italic : FontStyle.Normal)
                .decoration({
                  type: this.getSegmentDecorationType(seg),
                  color: this.getSegmentFontColor(seg, this.config.textColor)
                })
                .textBackgroundStyle(this.getInlineBackground(seg) ? { color: this.getInlineBackground(seg), radius: 4 } : undefined)
                .onClick(() => {
                  if (seg.isLink && seg.linkUrl) {
                    this.openLink(seg.linkUrl);
                  }
                })
            })
          }
          .lineHeight(this.config.lineHeight)
          .layoutWeight(1)
        }
        .width('100%')
        .margin({ bottom: this.config.spacing.listItemBottom })
        .alignItems(VerticalAlign.Center)
      } else if (this.block.type === 'orderedListItem') {
        Row() {
          // Number (e.g., "1.")
          Text((this.block as OrderedListItemBlock).number + '.')
            .fontSize(this.config.baseFontSize)
            .lineHeight(this.config.lineHeight)
            .fontColor(this.config.textColor)
            .width(LIST_MARKER_WIDTH)
            .textAlign(TextAlign.End)
          
          // List item content with inline styles
          Text() {
            ForEach(this.parseSegments(this.block.text), (seg: TextSegment) => {
              Span(seg.content)
                .fontSize(this.getSegmentFontSize(seg, this.config.baseFontSize))
                .fontFamily(this.getSegmentFontFamily(seg))
                .fontColor(this.getSegmentFontColor(seg, this.config.textColor))
                .fontWeight(seg.isBold ? FontWeight.Bold : FontWeight.Normal)
                .fontStyle(seg.isItalic ? FontStyle.Italic : FontStyle.Normal)
                .decoration({
                  type: this.getSegmentDecorationType(seg),
                  color: this.getSegmentFontColor(seg, this.config.textColor)
                })
                .textBackgroundStyle(this.getInlineBackground(seg) ? { color: this.getInlineBackground(seg), radius: 4 } : undefined)
                .onClick(() => {
                  if (seg.isLink && seg.linkUrl) {
                    this.openLink(seg.linkUrl);
                  }
                })
            })
          }
          .lineHeight(this.config.lineHeight)
          .layoutWeight(1)
        }
        .width('100%')
        .margin({ bottom: this.config.spacing.listItemBottom })
        .alignItems(VerticalAlign.Center)
      } else if (this.block.type === 'taskListItem') {
        Row() {
          // Checkbox
          Text((this.block as TaskListItemBlock).checked ? '☑' : '☐')
            .fontSize(this.config.baseFontSize)
            .lineHeight(this.config.lineHeight)
            .fontColor(this.config.textColor)
            .width(LIST_MARKER_WIDTH)
            .textAlign(TextAlign.Center)
          
          // List item content with inline styles
          Text() {
            ForEach(this.parseSegments(this.block.text), (seg: TextSegment) => {
              Span(seg.content)
                .fontSize(this.getSegmentFontSize(seg, this.config.baseFontSize))
                .fontFamily(this.getSegmentFontFamily(seg))
                .fontColor(this.getSegmentFontColor(seg, this.config.textColor))
                .fontWeight(seg.isBold ? FontWeight.Bold : FontWeight.Normal)
                .fontStyle(seg.isItalic ? FontStyle.Italic : FontStyle.Normal)
                .decoration({
                  type: this.getSegmentDecorationType(seg),
                  color: this.getSegmentFontColor(seg, this.config.textColor)
                })
                .textBackgroundStyle(this.getInlineBackground(seg) ? { color: this.getInlineBackground(seg), radius: 4 } : undefined)
                .onClick(() => {
                  if (seg.isLink && seg.linkUrl) {
                    this.openLink(seg.linkUrl);
                  }
                })
            })
          }
          .lineHeight(this.config.lineHeight)
          .layoutWeight(1)
        }
        .width('100%')
        .margin({ bottom: this.config.spacing.listItemBottom })
        .alignItems(VerticalAlign.Center)
      } else if (this.block.type === 'blockquote') {
        Column() {
          // Blockquote content with inline styles
          Text() {
            ForEach(this.parseSegments(this.block.text), (seg: TextSegment) => {
              Span(seg.content)
                .fontSize(this.getSegmentFontSize(seg, this.config.baseFontSize))
                .fontFamily(this.getSegmentFontFamily(seg))
                .fontColor(this.getSegmentFontColor(seg, this.config.blockquoteTextColor))
                .fontWeight(seg.isBold ? FontWeight.Bold : FontWeight.Normal)
                .fontStyle(seg.isItalic ? FontStyle.Italic : FontStyle.Normal)
                .decoration({
                  type: this.getSegmentDecorationType(seg),
                  color: this.getSegmentFontColor(seg, this.config.blockquoteTextColor)
                })
                .textBackgroundStyle(this.getInlineBackground(seg) ? { color: this.getInlineBackground(seg), radius: 4 } : undefined)
                .onClick(() => {
                  if (seg.isLink && seg.linkUrl) {
                    this.openLink(seg.linkUrl);
                  }
                })
            })
          }
          .lineHeight(this.config.lineHeight)
          .width('100%')
        }
        .width('100%')
        .margin({ bottom: this.config.spacing.blockquoteBottom, left: 4 })
        .padding({ left: 12, top: 8, bottom: 8 })
        .backgroundColor(this.config.blockquoteBgColor)
        .borderRadius(4)
        .border({
          width: { left: 4 },
          color: this.config.blockquoteBorderColor
        })
      } else if (this.block.type === 'horizontalRule') {
        Divider()
          .color(this.config.horizontalRuleColor)
          .strokeWidth(1)
          .width('100%')
          .margin({ top: this.config.spacing.horizontalRuleTop, bottom: this.config.spacing.horizontalRuleBottom })
      } else if (this.block.type === 'table') {
        this.buildTableView(this.block as TableBlock)
      }
    }
    .width('100%')
    .alignItems(HorizontalAlign.Start)
  }

  getHeadingSize(level: number): number {
    return this.config.headingSizes[level] || this.config.baseFontSize;
  }

  /**
   * Build table view using Column + Row layout
   */
  @Builder
  buildTableView(tableBlock: TableBlock) {
    Column() {
      // Header row
      Row() {
        ForEach(tableBlock.headers, (header: string, index: number) => {
          Text() {
            ForEach(this.parseSegments(header), (seg: TextSegment) => {
              Span(seg.content)
                .fontSize(this.getSegmentFontSize(seg, this.config.smallFontSize))
                .fontFamily(this.getSegmentFontFamily(seg))
                .fontColor(this.getSegmentFontColor(seg, this.config.headingColor))
                .fontWeight(FontWeight.Bold)
                .fontStyle(seg.isItalic ? FontStyle.Italic : FontStyle.Normal)
                .decoration({
                  type: this.getSegmentDecorationType(seg),
                  color: this.getSegmentFontColor(seg, this.config.headingColor)
                })
                .textBackgroundStyle(this.getInlineBackground(seg) ? { color: this.getInlineBackground(seg), radius: 4 } : undefined)
                .onClick(() => {
                  if (seg.isLink && seg.linkUrl) {
                    this.openLink(seg.linkUrl);
                  }
                })
            })
          }
            .lineHeight(this.config.lineHeight)
            .textAlign(this.getAlignment(tableBlock.alignments[index]))
            .padding({ left: 8, right: 8, top: 8, bottom: 8 })
            .layoutWeight(1)
        })
      }
      .width('100%')
      .backgroundColor(this.config.tableHeaderBgColor)
      .border({ width: { bottom: 2 }, color: this.config.tableBorderColor })

      // Data rows
      ForEach(tableBlock.rows, (row: string[], rowIndex: number) => {
        Row() {
          ForEach(row, (cell: string, colIndex: number) => {
            Text() {
              ForEach(this.parseSegments(cell), (seg: TextSegment) => {
                Span(seg.content)
                  .fontSize(this.getSegmentFontSize(seg, this.config.smallFontSize))
                  .fontFamily(this.getSegmentFontFamily(seg))
                  .fontColor(this.getSegmentFontColor(seg, this.config.textColor))
                  .fontWeight(seg.isBold ? FontWeight.Bold : FontWeight.Normal)
                  .fontStyle(seg.isItalic ? FontStyle.Italic : FontStyle.Normal)
                  .decoration({
                    type: this.getSegmentDecorationType(seg),
                    color: this.getSegmentFontColor(seg, this.config.textColor)
                  })
                  .textBackgroundStyle(this.getInlineBackground(seg) ? { color: this.getInlineBackground(seg), radius: 4 } : undefined)
                  .onClick(() => {
                    if (seg.isLink && seg.linkUrl) {
                      this.openLink(seg.linkUrl);
                    }
                  })
              })
            }
              .lineHeight(this.config.lineHeight)
              .textAlign(this.getAlignment(tableBlock.alignments[colIndex]))
              .padding({ left: 8, right: 8, top: 8, bottom: 8 })
              .layoutWeight(1)
          })
        }
        .width('100%')
        .backgroundColor(rowIndex % 2 === 1 ? this.config.tableStripeBgColor : Color.White)
        .border({ width: { bottom: 1 }, color: this.config.tableBorderColor })
      })
    }
    .width('100%')
    .margin({ top: this.config.spacing.tableTop, bottom: this.config.spacing.tableBottom })
    .border({ width: 1, color: this.config.tableBorderColor })
    .borderRadius(4)
    .clip(true)
  }

  /**
   * Get TextAlign from alignment string
   */
  getAlignment(alignment: 'left' | 'center' | 'right' | null | undefined): TextAlign {
    if (alignment === 'center') {
      return TextAlign.Center;
    } else if (alignment === 'right') {
      return TextAlign.End;
    }
    return TextAlign.Start;
  }
}
