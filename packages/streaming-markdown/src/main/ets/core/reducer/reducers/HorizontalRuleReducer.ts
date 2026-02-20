import { BlockDiff, HorizontalRuleBlock, ListItemBlock } from "../../protocol";
import { BaseReducer } from "../BaseReducer";
import { ReducerContext, ReducerResult, ParseMode } from "../types";

/**
 * HorizontalRuleReducer - Handles horizontal rules
 *
 * Responsibilities:
 * 1. Detect horizontal rule start (--- or *** or ___ at line start)
 * 2. Collect 3 or more characters
 * 3. Confirm on newline or end of input
 * 4. Handle fall back to list when pattern is "- "
 *
 * State transitions:
 * Paragraph -> HorizontalRule (-, *, or _ detected at line start)
 * HorizontalRule -> Paragraph (confirmed with 3+ chars and newline)
 * HorizontalRule -> List (when pattern is "- ", fall back to list)
 */
export class HorizontalRuleReducer extends BaseReducer {
  /**
   * Check if horizontal rule mode can start
   * Must be at line start and character is -, *, or _
   */
  canStartHorizontalRule(char: string, context: ReducerContext): boolean {
    return (
      (char === "-" || char === "*" || char === "_") &&
      context.mode === ParseMode.Paragraph &&
      (!context.currentBlock || context.currentBlock.text === "")
    );
  }

  /**
   * Start horizontal rule mode
   * Returns handled: true to consume the character
   */
  startHorizontalRule(context: ReducerContext, char: string): ReducerResult {
    // Start counting
    context.hrDashCount = 1;
    // Store the character type in languageBuffer
    context.languageBuffer = char;
    return { diffs: [], handled: true, newMode: ParseMode.HorizontalRule };
  }

  /**
   * Main processing logic
   */
  process(char: string, context: ReducerContext): ReducerResult {
    if (context.mode !== ParseMode.HorizontalRule) {
      return this.notHandled();
    }

    const diffs: BlockDiff[] = [];
    const hrChar = context.languageBuffer;
    const count = context.hrDashCount;

    // Handle newline - check if we have enough characters
    if (char === "\n") {
      if (count >= 3) {
        // Confirmed horizontal rule
        const block = this.createHorizontalRuleBlock(context);
        diffs.push(this.createAppendDiff(block));
        
        // Reset
        context.hrDashCount = 0;
        context.languageBuffer = "";
        context.mode = ParseMode.Paragraph;
        context.currentBlock = null;
        
        return this.withDiffs(...diffs);
      } else {
        // Not enough characters, fall back to paragraph
        const fallbackText = hrChar.repeat(count);
        context.hrDashCount = 0;
        context.languageBuffer = "";
        context.mode = ParseMode.Paragraph;
        
        const newDiffs = this.appendToParagraph(fallbackText, context);
        diffs.push(...newDiffs);
        return this.withDiffs(...diffs);
      }
    }

    // Special case: "- " should be handled as list (supports - item and - [ ] task)
    if (char === " " && hrChar === "-" && count === 1) {
      // Switch to list mode and let ListReducer handle the rest
      // Set state so ListReducer knows we've already seen "- "
      context.hrDashCount = 0;
      context.languageBuffer = "";
      context.taskListChecked = 'space_seen';  // Mark that we've seen "- "
      
      // Switch to List mode and consume the space
      // ListReducer will continue from 'space_seen' state
      return this.switchTo(ParseMode.List);
    }

    // Continue collecting same characters
    if (char === hrChar) {
      context.hrDashCount++;
      return this.noChange();
    }

    // Any other character interrupts the pattern
    const fallbackText = hrChar.repeat(count) + char;
    context.hrDashCount = 0;
    context.languageBuffer = "";
    context.mode = ParseMode.Paragraph;
    
    const newDiffs = this.appendToParagraph(fallbackText, context);
    diffs.push(...newDiffs);
    return this.withDiffs(...diffs);
  }

  /**
   * Flush pending backticks
   */
  flushBackticks(count: number, context: ReducerContext): ReducerResult {
    if (context.mode !== ParseMode.HorizontalRule) {
      return this.notHandled();
    }

    const hrChar = context.languageBuffer;
    const fallbackText = hrChar.repeat(context.hrDashCount);
    context.hrDashCount = 0;
    context.languageBuffer = "";
    context.mode = ParseMode.Paragraph;

    const diffs: BlockDiff[] = [];
    
    const newDiffs = this.appendToParagraph(fallbackText, context);
    diffs.push(...newDiffs);
    
    const ticks = "`".repeat(count);
    const moreDiffs = this.appendToParagraph(ticks, context);
    diffs.push(...moreDiffs);
    
    return this.withDiffs(...diffs);
  }

  /**
   * Create horizontal rule block
   */
  private createHorizontalRuleBlock(context: ReducerContext): HorizontalRuleBlock {
    const block: HorizontalRuleBlock = {
      id: context.nextBlockId++,
      type: "horizontalRule",
      text: "",
    };

    context.blocks.push(block);
    context.currentBlock = block;
    return block;
  }

  /**
   * Create list item block (for fallback to list mode)
   */
  private createListItemBlock(context: ReducerContext): ListItemBlock {
    const block: ListItemBlock = {
      id: context.nextBlockId++,
      type: "listItem",
      text: "",
    };

    context.blocks.push(block);
    context.currentBlock = block;
    return block;
  }
}
