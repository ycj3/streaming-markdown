import { BlockDiff, HeadingBlock } from "../../protocol";
import { BaseReducer } from "../BaseReducer";
import { ReducerContext, ReducerResult, ParseMode } from "../types";

/**
 * HeadingReducer - Handles Markdown headings
 *
 * Responsibilities:
 * 1. Detect heading start (# at line start)
 * 2. Collect consecutive # to determine level (1-6)
 * 3. Wait for space then create heading block
 * 4. Handle heading content
 *
 * State transitions:
 * Paragraph -> Heading (# detected at line start)
 * Heading -> Heading (continue collecting #)
 * Heading -> Paragraph (non-# non-space character encountered, fall back)
 * Heading -> Paragraph (space encountered, create heading and switch)
 */
export class HeadingReducer extends BaseReducer {
  /**
   * Check if heading mode can start
   * Must be at line start and character is #
   */
  canStartHeading(char: string, context: ReducerContext): boolean {
    return (
      char === "#" &&
      context.mode === ParseMode.Paragraph &&
      (!context.currentBlock || context.currentBlock.text === "")
    );
  }

  /**
   * Start heading mode
   * Note: Returns handled: false and newMode so the triggering '#' character continues 
   * to be processed by HeadingReducer.process() which will count it in headingLevel
   */
  startHeading(context: ReducerContext): ReducerResult {
    context.headingLevel = 0;  // Will be incremented when process() handles the first '#'
    return { diffs: [], handled: false, newMode: ParseMode.Heading };
  }

  /**
   * Main processing logic
   */
  process(char: string, context: ReducerContext): ReducerResult {
    if (context.mode !== ParseMode.Heading) {
      return this.notHandled();
    }

    const diffs: BlockDiff[] = [];

    if (char === "#") {
      // Continue collecting #
      context.headingLevel++;

      // If more than 6 #, fall back to paragraph
      if (context.headingLevel > 6) {
        const hashes = "#".repeat(context.headingLevel);
        context.headingLevel = 0;
        context.mode = ParseMode.Paragraph;

        const newDiffs = this.appendToParagraph(hashes, context);
        diffs.push(...newDiffs);

        return this.withDiffs(...diffs);
      }

      return this.noChange();
    }

    if (char === " ") {
      // Check if heading block already created (headingLevel === 0 after creation)
      if (context.headingLevel === 0) {
        // This is content space after heading marker, append to heading text
        this.appendToCurrentBlock(char, context);
        const patch = this.emitPatch(context);
        return patch ? this.withDiffs(patch) : this.noChange();
      }
      
      // First space after # sequence - create heading block
      const block = this.createHeadingBlock(context);
      diffs.push(this.createAppendDiff(block));
      context.headingLevel = 0;  // Mark as created

      return this.withDiffs(...diffs);
    }

    // Check if we're collecting heading content (heading block already created)
    if (context.headingLevel === 0 && context.currentBlock?.type === "heading") {
      // Collect heading content
      if (char === "\n") {
        // End of heading, switch to paragraph mode for next block
        context.mode = ParseMode.Paragraph;
        context.currentBlock = null;  // Clear current block for next block detection
        return this.noChange();
      }
      
      this.appendToCurrentBlock(char, context);
      const patch = this.emitPatch(context);
      return patch ? this.withDiffs(patch) : this.noChange();
    }

    // Other character encountered before space, fall back to paragraph mode
    const hashes = "#".repeat(context.headingLevel);
    context.headingLevel = 0;
    context.mode = ParseMode.Paragraph;

    // First append the #s
    let newDiffs = this.appendToParagraph(hashes, context);
    diffs.push(...newDiffs);

    // Then append current character
    newDiffs = this.appendToParagraph(char, context);
    diffs.push(...newDiffs);

    return this.withDiffs(...diffs);
  }

  /**
   * Flush pending backticks
   * Heading mode should not have unprocessed backticks, but just in case
   */
  flushBackticks(count: number, context: ReducerContext): ReducerResult {
    if (context.mode !== ParseMode.Heading) {
      return this.notHandled();
    }

    // If heading block already created, append backticks to heading content
    if (context.headingLevel === 0 && context.currentBlock?.type === "heading") {
      const ticks = "`".repeat(count);
      this.appendToCurrentBlock(ticks, context);
      const patch = this.emitPatch(context);
      return patch ? this.withDiffs(patch) : this.noChange();
    }

    // Fall back to paragraph mode and handle backticks
    const hashes = "#".repeat(context.headingLevel);
    context.headingLevel = 0;
    context.mode = ParseMode.Paragraph;

    const diffs: BlockDiff[] = [];

    // First append the #s
    let newDiffs = this.appendToParagraph(hashes, context);
    diffs.push(...newDiffs);

    // Then append backticks
    const ticks = "`".repeat(count);
    newDiffs = this.appendToParagraph(ticks, context);
    diffs.push(...newDiffs);

    return this.withDiffs(...diffs);
  }

  /**
   * Create heading block
   */
  private createHeadingBlock(context: ReducerContext): HeadingBlock {
    const block: HeadingBlock = {
      id: context.nextBlockId++,
      type: "heading",
      level: context.headingLevel,
      text: "",
    };

    context.blocks.push(block);
    context.currentBlock = block;
    return block;
  }
}
