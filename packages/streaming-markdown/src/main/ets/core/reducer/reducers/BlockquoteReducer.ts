import { BlockDiff, BlockquoteBlock } from "../../protocol";
import { BaseReducer } from "../BaseReducer";
import { ReducerContext, ReducerResult, ParseMode } from "../types";

/**
 * BlockquoteReducer - Handles blockquotes
 *
 * Responsibilities:
 * 1. Detect blockquote start (> at line start)
 * 2. Collect blockquote content
 * 3. Handle newlines (end current blockquote)
 *
 * State transitions:
 * Paragraph -> Blockquote (> detected at line start)
 * Blockquote -> Paragraph (newline encountered)
 */
export class BlockquoteReducer extends BaseReducer {
  /**
   * Check if blockquote mode can start
   * Must be at line start and character is >
   */
  canStartBlockquote(char: string, context: ReducerContext): boolean {
    return (
      char === ">" &&
      context.mode === ParseMode.Paragraph &&
      (!context.currentBlock || context.currentBlock.text === "")
    );
  }

  /**
   * Start blockquote mode
   * Returns handled: true to consume the '>' character
   */
  startBlockquote(context: ReducerContext): ReducerResult {
    // Switch to blockquote mode, '>' is consumed
    return { diffs: [], handled: true, newMode: ParseMode.Blockquote };
  }

  /**
   * Main processing logic
   */
  process(char: string, context: ReducerContext): ReducerResult {
    if (context.mode !== ParseMode.Blockquote) {
      return this.notHandled();
    }

    const diffs: BlockDiff[] = [];

    // Handle newline - end blockquote mode
    if (char === "\n") {
      context.mode = ParseMode.Paragraph;
      context.currentBlock = null;  // Clear for next block detection
      return this.noChange();
    }

    // If no current block, create blockquote block
    if (!context.currentBlock || context.currentBlock.type !== "blockquote") {
      const block = this.createBlockquoteBlock(context);
      diffs.push(this.createAppendDiff(block));
      
      // Skip the first space after '>' if present
      if (char === " ") {
        return this.withDiffs(...diffs);
      }
    }

    // Append to current blockquote
    this.appendToCurrentBlock(char, context);
    const patch = this.emitPatch(context);
    if (patch) {
      diffs.push(patch);
    }

    return this.withDiffs(...diffs);
  }

  /**
   * Flush pending backticks
   */
  flushBackticks(count: number, context: ReducerContext): ReducerResult {
    if (context.mode !== ParseMode.Blockquote) {
      return this.notHandled();
    }

    const ticks = "`".repeat(count);
    
    // If no current block yet, create one
    if (!context.currentBlock || context.currentBlock.type !== "blockquote") {
      const block = this.createBlockquoteBlock(context);
      block.text = ticks;
      const patch = this.emitPatch(context);
      return this.withDiffs(
        this.createAppendDiff(block),
        ...(patch ? [patch] : [])
      );
    }

    this.appendToCurrentBlock(ticks, context);
    const patch = this.emitPatch(context);
    return patch ? this.withDiffs(patch) : this.noChange();
  }

  /**
   * Create blockquote block
   */
  private createBlockquoteBlock(context: ReducerContext): BlockquoteBlock {
    const block: BlockquoteBlock = {
      id: context.nextBlockId++,
      type: "blockquote",
      text: "",
    };

    context.blocks.push(block);
    context.currentBlock = block;
    return block;
  }
}
