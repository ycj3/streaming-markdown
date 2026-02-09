import { BlockDiff } from "../../protocol";
import { BaseReducer } from "../BaseReducer";
import { ReducerContext, ReducerResult, ParseMode } from "../types";

/**
 * InlineCodeReducer - Handles inline code `code`
 *
 * Responsibilities:
 * 1. Detect inline code start (single backtick, not three)
 * 2. Collect inline code content
 * 3. Detect inline code end (single backtick)
 *
 * State transitions:
 * Paragraph -> InlineCode (single backtick detected, not code fence)
 * InlineCode -> Paragraph (end backtick detected)
 */
export class InlineCodeReducer extends BaseReducer {
  /**
   * Check if inline code mode can start
   * Triggered when pendingBackticks === 1 and not in code mode
   */
  canStartInlineCode(context: ReducerContext): boolean {
    return (
      context.pendingBackticks === 1 &&
      context.mode !== ParseMode.Code &&
      context.mode !== ParseMode.FenceStart &&
      context.mode !== ParseMode.InlineCode
    );
  }

  /**
   * Start inline code mode
   * Returns handled: false so the current character continues to be processed
   * and added to the inline code block
   */
  startInlineCode(context: ReducerContext): ReducerResult {
    context.pendingBackticks = 0;
    const block = this.createBlock("inlineCode", context);
    // Return handled: false - the triggering character should continue to be processed
    // and added to the inline code block by InlineCodeReducer.process()
    return { diffs: [this.createAppendDiff(block)], handled: false, newMode: ParseMode.InlineCode };
  }

  /**
   * Main processing logic
   */
  process(char: string, context: ReducerContext): ReducerResult {
    if (context.mode !== ParseMode.InlineCode) {
      return this.notHandled();
    }

    // Handle newline - close current inline code block
    if (char === "\n") {
      this.closeCurrentBlock(context);
      return this.noChange();
    }

    // Handle normal character
    this.appendToCurrentBlock(char, context);

    const patch = this.emitPatch(context);
    return patch
      ? this.withDiffs(patch)
      : this.noChange();
  }

  /**
   * Handle end backtick
   * Called when backtick is detected in InlineCode mode
   */
  handleEndBacktick(context: ReducerContext): ReducerResult {
    if (context.mode !== ParseMode.InlineCode) {
      return this.notHandled();
    }

    // End inline code
    this.closeCurrentBlock(context);
    context.pendingBackticks = 0;

    return this.noChange();
  }

  /**
   * Flush pending backticks
   * For inline code, single backtick means end
   */
  flushBackticks(count: number, context: ReducerContext): ReducerResult {
    if (context.mode !== ParseMode.InlineCode) {
      return this.notHandled();
    }

    // If single backtick, end inline code
    if (count === 1) {
      this.closeCurrentBlock(context);
      return this.noChange();
    }

    // Multiple backticks, append as content
    const ticks = "`".repeat(count);
    this.appendToCurrentBlock(ticks, context);

    const patch = this.emitPatch(context);
    return patch
      ? this.withDiffs(patch)
      : this.noChange();
  }

  /**
   * Close handling
   * Can repair incomplete inline code
   */
  close(context: ReducerContext): ReducerResult {
    if (context.mode !== ParseMode.InlineCode) {
      return this.notHandled();
    }

    // Can add inline code repair logic here
    // For example: handle unclosed inline code
    // For now, just close
    this.closeCurrentBlock(context);

    return this.noChange();
  }
}
