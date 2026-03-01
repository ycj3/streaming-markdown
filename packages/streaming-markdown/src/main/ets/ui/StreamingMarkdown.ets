import { MarkdownStream } from '../core/stream'
import { Block, BlockDiff, ParagraphBlock } from '../core/protocol'
import { BlockView } from './BlockView'
import { resolveStreamingMarkdownConfig, StreamingMarkdownConfig, StreamingMarkdownResolvedConfig } from './config'

/**
 * Streaming Markdown component props
 */
export interface StreamingMarkdownProps {
  stream: MarkdownStream
  config?: StreamingMarkdownConfig
  /**
   * Callback when streaming completes
   */
  onComplete?: () => void
}

@Component
export struct StreamingMarkdown {
  stream: MarkdownStream = new MarkdownStream()
  @Prop config: StreamingMarkdownConfig = {}
  onComplete?: () => void

  @State private blocks: Block[] = []
  private unsubscribeDiff?: () => void
  private unsubscribeComplete?: () => void
  private unsubscribeReset?: () => void

  aboutToAppear() {
    this.bindStream()
  }

  aboutToDisappear() {
    this.unbindStream()
  }

  private bindStream() {
    this.unbindStream()
    this.blocks = this.stream.getBlocks()
    this.unsubscribeDiff = this.stream.subscribe((diff: BlockDiff) => {
      if (diff.kind === 'append') {
        this.blocks = [...this.blocks, diff.block]
      } else if (diff.kind === 'patch') {
        const idx = this.blocks.findIndex(b => b.id === diff.id)
        if (idx >= 0) {
          const newBlocks = [...this.blocks]
          newBlocks[idx] = diff.block
          this.blocks = newBlocks
        }
      }
    })

    this.unsubscribeComplete = this.stream.onComplete(() => {
      if (this.onComplete) {
        this.onComplete()
      }
    })

    this.unsubscribeReset = this.stream.onReset(() => {
      this.blocks = []
    })
  }

  private unbindStream() {
    if (this.unsubscribeDiff) {
      this.unsubscribeDiff()
      this.unsubscribeDiff = undefined
    }

    if (this.unsubscribeComplete) {
      this.unsubscribeComplete()
      this.unsubscribeComplete = undefined
    }

    if (this.unsubscribeReset) {
      this.unsubscribeReset()
      this.unsubscribeReset = undefined
    }
  }

  private getResolvedConfig(): StreamingMarkdownResolvedConfig {
    return resolveStreamingMarkdownConfig(this.config)
  }

  private isMathFenceParagraph(block: Block): boolean {
    if (block.type !== 'paragraph') {
      return false
    }
    const paragraph = block as ParagraphBlock
    return paragraph.text.trim() === '$$'
  }

  /**
   * The reducer currently closes paragraph on every newline, so block math written as:
   * $$\n...equation...\n$$
   * may arrive as three paragraph blocks. Re-join this shape at render time.
   */
  private getDisplayBlocks(): Block[] {
    const result: Block[] = []

    for (let i = 0; i < this.blocks.length; i++) {
      const current = this.blocks[i]
      if (!this.isMathFenceParagraph(current)) {
        result.push(current)
        continue
      }

      let closeIndex = -1
      const equationLines: string[] = []
      for (let j = i + 1; j < this.blocks.length; j++) {
        const candidate = this.blocks[j]
        if (this.isMathFenceParagraph(candidate)) {
          closeIndex = j
          break
        }
        if (candidate.type !== 'paragraph') {
          closeIndex = -1
          break
        }
        const paragraphCandidate = candidate as ParagraphBlock
        equationLines.push(paragraphCandidate.text)
      }

      if (closeIndex > i + 1) {
        const mergedText = `$$\n${equationLines.join('\n')}\n$$`
        const mergedBlock: ParagraphBlock = {
          id: current.id,
          type: 'paragraph',
          text: mergedText
        }
        result.push(mergedBlock)
        i = closeIndex
        continue
      }

      result.push(current)
    }

    return result
  }

  build() {
    List() {
      ForEach(this.getDisplayBlocks(), (block: Block) => {
        ListItem() {
          BlockView({ block: block, config: this.getResolvedConfig() })
        }
      }, (block: Block) => {
        if (block.type === 'table') {
          return `${block.id}_${block.version || 0}`;
        }
        return block.id.toString() + "_" + block.text.length
      })
    }
    .padding({
      left: this.getResolvedConfig().contentPadding.left,
      right: this.getResolvedConfig().contentPadding.right,
      top: this.getResolvedConfig().contentPadding.top,
      bottom: this.getResolvedConfig().contentPadding.bottom
    })
  }
}
