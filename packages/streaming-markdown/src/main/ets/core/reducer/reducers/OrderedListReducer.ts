import { BlockDiff, OrderedListItemBlock } from "../../protocol";
import { BaseReducer } from "../BaseReducer";
import { ReducerContext, ReducerResult, ParseMode } from "../types";

/**
 * OrderedListReducer - Handles ordered list items
 *
 * Responsibilities:
 * 1. Detect ordered list item start (number at line start followed by ". ")
 * 2. Collect ordered list item content
 * 3. Handle newlines (end current list item)
 *
 * State transitions:
 * Paragraph -> OrderedList (digit detected at line start, building number)
 * OrderedList -> OrderedList (continue collecting digits)
 * OrderedList -> Paragraph (non-digit non-period-non-space encountered, fall back)
 * OrderedList -> OrderedListItem (". " encountered, create block)
 */
export class OrderedListReducer extends BaseReducer {
  /**
   * Check if ordered list item mode can start
   * Must be at line start and character is a digit
   */
  canStartOrderedList(char: string, context: ReducerContext): boolean {
    return (
      /\d/.test(char) &&
      context.mode === ParseMode.Paragraph &&
      (!context.currentBlock || context.currentBlock.text === "")
    );
  }

  /**
   * Start ordered list item mode
   * Returns handled: true to consume the digit character
   */
  startOrderedList(context: ReducerContext, char: string): ReducerResult {
    // Start building the number
    context.orderedListNumber = parseInt(char, 10);
    return { diffs: [], handled: true, newMode: ParseMode.OrderedList };
  }

  /**
   * Main processing logic
   */
  process(char: string, context: ReducerContext): ReducerResult {
    if (context.mode !== ParseMode.OrderedList) {
      return this.notHandled();
    }

    const diffs: BlockDiff[] = [];

    // Handle newline - end ordered list item mode
    if (char === "\n") {
      // If we have an active ordered list item, just end the mode
      if (context.currentBlock && context.currentBlock.type === "orderedListItem") {
        context.orderedListNumber = 0;
        context.mode = ParseMode.Paragraph;
        context.currentBlock = null;  // Clear for next list item detection
        return this.noChange();
      }
      
      // Otherwise fall back to paragraph with the collected number as text
      const numberStr = Math.abs(context.orderedListNumber).toString();
      context.orderedListNumber = 0;
      context.mode = ParseMode.Paragraph;
      
      const newDiffs = this.appendToParagraph(numberStr, context);
      diffs.push(...newDiffs);
      
      return this.withDiffs(...diffs);
    }

    // Continue collecting digits for the number
    if (/\d/.test(char)) {
      context.orderedListNumber = context.orderedListNumber * 10 + parseInt(char, 10);
      return this.noChange();
    }

    // Check for ". " pattern
    if (char === ".") {
      // Store that we've seen the period, wait for space
      // We'll use a negative number to indicate period was seen
      context.orderedListNumber = -Math.abs(context.orderedListNumber);
      return this.noChange();
    }

    // Space after period - create ordered list item block if not exists
    if (char === " " && context.orderedListNumber < 0) {
      // If we already have an ordered list item block, just skip this space
      if (context.currentBlock && context.currentBlock.type === "orderedListItem") {
        return this.noChange();
      }
      // Otherwise create a new block
      const actualNumber = Math.abs(context.orderedListNumber);
      const block = this.createOrderedListItemBlock(context, actualNumber);
      diffs.push(this.createAppendDiff(block));
      return this.withDiffs(...diffs);
    }

    // If we already have an ordered list item block, append to it
    if (context.currentBlock && context.currentBlock.type === "orderedListItem") {
      this.appendToCurrentBlock(char, context);
      const patch = this.emitPatch(context);
      if (patch) {
        diffs.push(patch);
      }
      return this.withDiffs(...diffs);
    }

    // Other character encountered before ". " pattern, fall back to paragraph
    const numberStr = context.orderedListNumber.toString();
    context.orderedListNumber = 0;
    context.mode = ParseMode.Paragraph;

    // Append the number as text
    let newDiffs = this.appendToParagraph(numberStr, context);
    diffs.push(...newDiffs);

    // Then append current character
    newDiffs = this.appendToParagraph(char, context);
    diffs.push(...newDiffs);

    return this.withDiffs(...diffs);
  }

  /**
   * Flush pending backticks
   */
  flushBackticks(count: number, context: ReducerContext): ReducerResult {
    if (context.mode !== ParseMode.OrderedList) {
      return this.notHandled();
    }

    // If we have an active ordered list item, append backticks to it
    if (context.currentBlock && context.currentBlock.type === "orderedListItem") {
      const ticks = "`".repeat(count);
      this.appendToCurrentBlock(ticks, context);
      const patch = this.emitPatch(context);
      return patch ? this.withDiffs(patch) : this.noChange();
    }

    // Fall back to paragraph mode
    const numberStr = Math.abs(context.orderedListNumber).toString();
    context.orderedListNumber = 0;
    context.mode = ParseMode.Paragraph;

    const diffs: BlockDiff[] = [];

    // First append the number as text
    let newDiffs = this.appendToParagraph(numberStr, context);
    diffs.push(...newDiffs);

    // Then append backticks
    const ticks = "`".repeat(count);
    newDiffs = this.appendToParagraph(ticks, context);
    diffs.push(...newDiffs);

    return this.withDiffs(...diffs);
  }

  /**
   * Create ordered list item block
   */
  private createOrderedListItemBlock(context: ReducerContext, number: number): OrderedListItemBlock {
    const block: OrderedListItemBlock = {
      id: context.nextBlockId++,
      type: "orderedListItem",
      number: number,
      text: "",
    };

    context.blocks.push(block);
    context.currentBlock = block;
    return block;
  }
}
