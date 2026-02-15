import { Block, CodeBlock, TextSegment, HeadingBlock, ListItemBlock, OrderedListItemBlock, TaskListItemBlock, BlockquoteBlock, HorizontalRuleBlock, TableBlock } from '../core/protocol'
import { CodeBlockHeader } from './code-block/CodeBlockHeader'
import { CodeBlockBody } from './code-block/CodeBlockBody'
import { parseInlineStyles } from '../core/utils/inline-style-parser'
import { common } from '@kit.AbilityKit';
import { BusinessError } from '@kit.BasicServicesKit';

/**
 * Table cell info for Grid rendering
 */
interface TableCellInfo {
  content: string
  rowIndex: number
  colIndex: number
}

@Component
export struct BlockView {
  @Prop block: Block;

  aboutToAppear() {
    if (this.block.type === 'table') {
      const tableBlock = this.block as TableBlock;
      console.log(`[BlockView] aboutToAppear table: headers=${tableBlock.headers.length}, rows=${tableBlock.rows.length}`);
      console.log(`[BlockView] table headers: [${tableBlock.headers.join(', ')}]`);
      console.log(`[BlockView] table rows: ${JSON.stringify(tableBlock.rows)}`);
      console.log(`[BlockView] table alignments: ${JSON.stringify(tableBlock.alignments)}`);
    }
  }

  // Helper to parse segments from the paragraph text
  parseSegments(text: string): TextSegment[] {
    return parseInlineStyles(text);
  }

  // Open link URL in system browser
  openLink(url: string) {
    const context = getContext(this) as common.UIAbilityContext;
    context.openLink(url)
      .then(() => {
        console.info('open link success');
      })
      .catch((error: BusinessError) => {
        console.error('open link failed: ' + JSON.stringify(error));
      });
  }

  build() {
    Column() {
      if (this.block.type === 'heading') {
        Text() {
          ForEach(this.parseSegments(this.block.text), (seg: TextSegment) => {
            Span(seg.content)
              .fontSize(this.getHeadingSize((this.block as HeadingBlock).level))
              .fontWeight(FontWeight.Bold)
              .fontColor(seg.isLink ? '#1976D2' : '#1A1A1A')
              .fontFamily(seg.isCode ? 'monospace' : 'sans-serif')
              .fontStyle(seg.isItalic ? FontStyle.Italic : FontStyle.Normal)
              .decoration({
                type: seg.isStrikethrough ? TextDecorationType.LineThrough : seg.isLink ? TextDecorationType.Underline : TextDecorationType.None,
                color: seg.isLink ? '#1976D2' : '#1A1A1A'
              })
              .textBackgroundStyle(seg.isCode ? { color: '#F5F5F5', radius: 4 } : undefined)
              .onClick(() => {
                if (seg.isLink && seg.linkUrl) {
                  this.openLink(seg.linkUrl);
                }
              })
          })
        }
        .width('100%')
        .margin({ top: 12, bottom: 8 })
      } else if (this.block.type === 'paragraph') {
        Text() {
          ForEach(this.parseSegments(this.block.text), (seg: TextSegment) => {
            Span(seg.content)
              .fontSize(16)
              // Use monospace for code, otherwise standard sans-serif
              .fontFamily(seg.isCode ? 'monospace' : 'sans-serif')
              // Code usually has a distinct color
              .fontColor(seg.isCode ? '#D32F2F' : seg.isLink ? '#1976D2' : '#333333')
              .fontWeight(seg.isBold ? FontWeight.Bold : FontWeight.Normal)
              .fontStyle(seg.isItalic ? FontStyle.Italic : FontStyle.Normal)
              .decoration({
                type: seg.isStrikethrough ? TextDecorationType.LineThrough : seg.isLink ? TextDecorationType.Underline : TextDecorationType.None,
                color: seg.isCode ? '#D32F2F' : seg.isLink ? '#1976D2' : '#333333'
              })
              // Inline code background style
              .textBackgroundStyle(seg.isCode ? { color: '#F5F5F5', radius: 4 } : undefined)
              .onClick(() => {
                if (seg.isLink && seg.linkUrl) {
                  this.openLink(seg.linkUrl);
                }
              })
          })
        }
        .width('100%')
        .margin({ bottom: 8 })
      } else if (this.block.type === 'code') {
        Column() {
          CodeBlockHeader({
            language: (this.block as CodeBlock).lang || '',
            code: this.block.text
          })
          Divider().color('#EEEEEE').strokeWidth(1)
          CodeBlockBody({
            code: this.block.text,
            language: (this.block as CodeBlock).lang || ''
          })
        }
        .alignItems(HorizontalAlign.Start)
        .margin({ top: 16, bottom: 16 })
        .width('100%')
        .clip(true)
        .borderRadius(12)
        .border({ width: 1, color: '#E5E5E5' })
      } else if (this.block.type === 'listItem') {
        Row() {
          // Bullet point
          Text('•')
            .fontSize(16)
            .fontColor('#333333')
            .margin({ right: 8 })
          
          // List item content with inline styles
          Text() {
            ForEach(this.parseSegments(this.block.text), (seg: TextSegment) => {
              Span(seg.content)
                .fontSize(16)
                .fontFamily(seg.isCode ? 'monospace' : 'sans-serif')
                .fontColor(seg.isCode ? '#D32F2F' : seg.isLink ? '#1976D2' : '#333333')
                .fontWeight(seg.isBold ? FontWeight.Bold : FontWeight.Normal)
                .fontStyle(seg.isItalic ? FontStyle.Italic : FontStyle.Normal)
                .decoration({
                  type: seg.isStrikethrough ? TextDecorationType.LineThrough : seg.isLink ? TextDecorationType.Underline : TextDecorationType.None,
                  color: seg.isCode ? '#D32F2F' : seg.isLink ? '#1976D2' : '#333333'
                })
                .textBackgroundStyle(seg.isCode ? { color: '#F5F5F5', radius: 4 } : undefined)
                .onClick(() => {
                  if (seg.isLink && seg.linkUrl) {
                    this.openLink(seg.linkUrl);
                  }
                })
            })
          }
          .layoutWeight(1)
        }
        .width('100%')
        .margin({ bottom: 4 })
        .alignItems(VerticalAlign.Top)
      } else if (this.block.type === 'orderedListItem') {
        Row() {
          // Number (e.g., "1.")
          Text((this.block as OrderedListItemBlock).number + '.')
            .fontSize(16)
            .fontColor('#333333')
            .margin({ right: 8 })
          
          // List item content with inline styles
          Text() {
            ForEach(this.parseSegments(this.block.text), (seg: TextSegment) => {
              Span(seg.content)
                .fontSize(16)
                .fontFamily(seg.isCode ? 'monospace' : 'sans-serif')
                .fontColor(seg.isCode ? '#D32F2F' : seg.isLink ? '#1976D2' : '#333333')
                .fontWeight(seg.isBold ? FontWeight.Bold : FontWeight.Normal)
                .fontStyle(seg.isItalic ? FontStyle.Italic : FontStyle.Normal)
                .decoration({
                  type: seg.isStrikethrough ? TextDecorationType.LineThrough : seg.isLink ? TextDecorationType.Underline : TextDecorationType.None,
                  color: seg.isCode ? '#D32F2F' : seg.isLink ? '#1976D2' : '#333333'
                })
                .textBackgroundStyle(seg.isCode ? { color: '#F5F5F5', radius: 4 } : undefined)
                .onClick(() => {
                  if (seg.isLink && seg.linkUrl) {
                    this.openLink(seg.linkUrl);
                  }
                })
            })
          }
          .layoutWeight(1)
        }
        .width('100%')
        .margin({ bottom: 4 })
        .alignItems(VerticalAlign.Top)
      } else if (this.block.type === 'taskListItem') {
        Row() {
          // Checkbox
          Text((this.block as TaskListItemBlock).checked ? '☑' : '☐')
            .fontSize(18)
            .fontColor('#333333')
            .margin({ right: 8 })
          
          // List item content with inline styles
          Text() {
            ForEach(this.parseSegments(this.block.text), (seg: TextSegment) => {
              Span(seg.content)
                .fontSize(16)
                .fontFamily(seg.isCode ? 'monospace' : 'sans-serif')
                .fontColor(seg.isCode ? '#D32F2F' : seg.isLink ? '#1976D2' : '#333333')
                .fontWeight(seg.isBold ? FontWeight.Bold : FontWeight.Normal)
                .fontStyle(seg.isItalic ? FontStyle.Italic : FontStyle.Normal)
                .decoration({
                  type: seg.isStrikethrough ? TextDecorationType.LineThrough : seg.isLink ? TextDecorationType.Underline : TextDecorationType.None,
                  color: seg.isCode ? '#D32F2F' : seg.isLink ? '#1976D2' : '#333333'
                })
                .textBackgroundStyle(seg.isCode ? { color: '#F5F5F5', radius: 4 } : undefined)
                .onClick(() => {
                  if (seg.isLink && seg.linkUrl) {
                    this.openLink(seg.linkUrl);
                  }
                })
            })
          }
          .layoutWeight(1)
        }
        .width('100%')
        .margin({ bottom: 4 })
        .alignItems(VerticalAlign.Top)
      } else if (this.block.type === 'blockquote') {
        Column() {
          // Blockquote content with inline styles
          Text() {
            ForEach(this.parseSegments(this.block.text), (seg: TextSegment) => {
              Span(seg.content)
                .fontSize(16)
                .fontFamily(seg.isCode ? 'monospace' : 'sans-serif')
                .fontColor(seg.isCode ? '#D32F2F' : seg.isLink ? '#1976D2' : '#666666')
                .fontWeight(seg.isBold ? FontWeight.Bold : FontWeight.Normal)
                .fontStyle(seg.isItalic ? FontStyle.Italic : FontStyle.Normal)
                .decoration({
                  type: seg.isStrikethrough ? TextDecorationType.LineThrough : seg.isLink ? TextDecorationType.Underline : TextDecorationType.None,
                  color: seg.isCode ? '#D32F2F' : seg.isLink ? '#1976D2' : '#666666'
                })
                .textBackgroundStyle(seg.isCode ? { color: '#F5F5F5', radius: 4 } : undefined)
                .onClick(() => {
                  if (seg.isLink && seg.linkUrl) {
                    this.openLink(seg.linkUrl);
                  }
                })
            })
          }
          .width('100%')
        }
        .width('100%')
        .margin({ bottom: 8, left: 4 })
        .padding({ left: 12, top: 8, bottom: 8 })
        .backgroundColor('#F9F9F9')
        .borderRadius(4)
        .border({
          width: { left: 4 },
          color: '#E0E0E0'
        })
      } else if (this.block.type === 'horizontalRule') {
        Divider()
          .color('#E0E0E0')
          .strokeWidth(1)
          .width('100%')
          .margin({ top: 16, bottom: 16 })
      } else if (this.block.type === 'table') {
        this.buildTableView(this.block as TableBlock)
      }
    }
    .width('100%')
    .alignItems(HorizontalAlign.Start)
  }

  getHeadingSize(level: number): number {
    const sizes = [0, 28, 24, 20, 18, 16, 14];
    return sizes[level] || 16;
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
          Text(header)
            .fontSize(14)
            .fontWeight(FontWeight.Bold)
            .fontColor('#1A1A1A')
            .textAlign(this.getAlignment(tableBlock.alignments[index]))
            .padding({ left: 8, right: 8, top: 8, bottom: 8 })
            .layoutWeight(1)
        })
      }
      .width('100%')
      .backgroundColor('#F5F5F5')
      .border({ width: { bottom: 2 }, color: '#E0E0E0' })

      // Data rows
      ForEach(tableBlock.rows, (row: string[], rowIndex: number) => {
        Row() {
          ForEach(row, (cell: string, colIndex: number) => {
            Text(cell)
              .fontSize(14)
              .fontColor('#333333')
              .textAlign(this.getAlignment(tableBlock.alignments[colIndex]))
              .padding({ left: 8, right: 8, top: 8, bottom: 8 })
              .layoutWeight(1)
          })
        }
        .width('100%')
        .backgroundColor(rowIndex % 2 === 1 ? '#FAFAFA' : Color.White)
        .border({ width: { bottom: 1 }, color: '#EEEEEE' })
      })
    }
    .width('100%')
    .margin({ top: 12, bottom: 12 })
    .border({ width: 1, color: '#E0E0E0' })
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
