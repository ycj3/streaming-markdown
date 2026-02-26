import { MarkdownStream } from '../core/stream'
import { Block, BlockDiff } from '../core/protocol'
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
  @Prop config?: StreamingMarkdownConfig
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

  build() {
    List() {
      ForEach(this.blocks, (block: Block) => {
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
