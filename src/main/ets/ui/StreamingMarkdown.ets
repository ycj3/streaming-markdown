import { StreamingMarkdownController, StreamingMode } from '../core/stream'
import { Block, BlockDiff } from '../core/protocol'
import { BlockView } from './BlockView'

/**
 * Streaming render mode
 * - char: character by character (default)
 * - word: word by word
 * - chunk: chunk/sentence by chunk
 */
export type { StreamingMode }

/**
 * Streaming Markdown component props
 */
export interface StreamingMarkdownProps {
  /**
   * Text content to stream render
   */
  text: string
  /**
   * Streaming render mode, defaults to 'char'
   */
  mode?: StreamingMode
  /**
   * Render interval in milliseconds, defaults to 30ms
   */
  interval?: number
  /**
   * Callback when streaming completes
   */
  onComplete?: () => void
}

@Component
export struct StreamingMarkdown {
  // Props
  text: string = ''
  mode: StreamingMode = 'char'
  interval: number = 30
  onComplete?: () => void

  // Internal state
  @State private blocks: Block[] = []
  private controller: StreamingMarkdownController | null = null

  aboutToAppear() {
    this.initAndStart()
  }

  aboutToDisappear() {
    this.cleanup()
  }

  /**
   * Initialize controller and start streaming
   */
  private initAndStart() {
    // Clean up existing controller
    this.cleanup()

    // Reset blocks
    this.blocks = []

    // Skip if no text
    if (this.text.length === 0) {
      return
    }

    // Create new controller with current props
    this.controller = new StreamingMarkdownController({
      mode: this.mode,
      interval: this.interval
    })

    // Subscribe to block updates
    this.controller.subscribe((diff: BlockDiff) => {
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

    // Subscribe to completion
    this.controller.onComplete(() => {
      if (this.onComplete) {
        this.onComplete()
      }
    })

    // Start streaming
    this.controller.start(this.text)
  }

  /**
   * Clean up controller resources
   */
  private cleanup() {
    if (this.controller) {
      this.controller.stop()
      this.controller = null
    }
  }

  build() {
    List() {
      ForEach(this.blocks, (block: Block) => {
        ListItem() {
          BlockView({ block: block })
        }
      }, (block: Block) => block.id.toString() + "_" + block.text.length)
    }
  }
}
