import { BlockDiff } from "../../protocol";
import { BaseReducer } from "../BaseReducer";
import { ReducerContext, ReducerResult, ParseMode } from "../types";

/**
 * ParagraphReducer - Handles normal paragraph text
 *
 * Responsibilities:
 * 1. Process normal text content
 * 2. Handle newlines (close current paragraph)
 * 3. Handle pending backticks (single or double backticks)
 * 4. Handle other special characters (backticks not triggered by code fence)
 *
 * Special handling:
 * - Newlines close current paragraph to prepare for next block
 * - Backticks not in groups of 3 (code fence) are treated as normal text
 */
export class ParagraphReducer extends BaseReducer {
  /**
   * Main processing logic
   */
  process(char: string, context: ReducerContext): ReducerResult {
    // Only handle in paragraph mode
    if (context.mode !== ParseMode.Paragraph) {
      return this.notHandled();
    }

    // Handle newline - close current paragraph
    if (char === "\n") {
      this.closeCurrentBlock(context);
      return this.noChange();
    }

    // Handle normal character
    const diffs: BlockDiff[] = [];

    // Append to paragraph
    const newDiffs = this.appendToParagraph(char, context);
    diffs.push(...newDiffs);

    return this.withDiffs(...diffs);
  }

  /**
   * Flush pending backticks
   * For paragraphs, append backticks as normal text
   */
  flushBackticks(count: number, context: ReducerContext): ReducerResult {
    // Only handle in paragraph mode
    if (context.mode !== ParseMode.Paragraph) {
      return this.notHandled();
    }

    const ticks = "`".repeat(count);
    const newDiffs = this.appendToParagraph(ticks, context);

    return this.withDiffs(...newDiffs);
  }

  /**
   * Close handling
   * Can perform paragraph-level cleanup
   */
  close(context: ReducerContext): ReducerResult {
    // No special cleanup needed in paragraph mode
    return this.noChange();
  }
}
