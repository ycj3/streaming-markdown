import { StreamingMarkdownController } from '../core/stream'
import { Block, BlockDiff, CodeBlock } from '../core/protocol'
import { BlockView } from './BlockView'

@Component
export struct StreamingMarkdown {
  controller: StreamingMarkdownController = new StreamingMarkdownController()

  @State private blocks: Block[] = []

  aboutToAppear() {
    this.controller.subscribe((diff: BlockDiff) => {
      if (diff.kind === 'append') {
        this.blocks = [...this.blocks, diff.block]
      } else if (diff.kind === 'patch') {
        const idx = this.blocks.findIndex(b => b.id === diff.id)
        if (idx >= 0) {
          const newBlocks = [...this.blocks];
          newBlocks[idx] = diff.block
          this.blocks = newBlocks
          console.info('Successfully patched block:', diff.id, 'New text:', diff.block.text);
        }
      }
    })
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
