import { BlockDiff, ListItemBlock, TaskListItemBlock } from "../../protocol";
import { BaseReducer } from "../BaseReducer";
import { ReducerContext, ReducerResult, ParseMode } from "../types";

/**
 * ListReducer - Handles unordered list items and task list items
 *
 * Responsibilities:
 * 1. Detect list item start (- at line start followed by space)
 * 2. Detect task list pattern (- [ ] or - [x] or - [X])
 * 3. Collect list item content
 * 4. Handle newlines (end current list item)
 *
 * Task list state machine:
 * null = just started (seen '-'), waiting for space
 * 'space_seen' = seen space after '-', waiting for '['
 * 'bracket_seen' = seen '[', waiting for ' ', 'x', or 'X'
 * 'unchecked' = seen '[ ', waiting for ']'
 * 'checked' = seen '[x' or '[X', waiting for ']'
 * 'close_seen' = seen ']', waiting for space to confirm
 */
export class ListReducer extends BaseReducer {
  /**
   * Check if list item mode can start
   * Must be at line start and see "-" character
   */
  canStartList(char: string, context: ReducerContext): boolean {
    return (
      char === "-" &&
      context.mode === ParseMode.Paragraph &&
      (!context.currentBlock || context.currentBlock.text === "")
    );
  }

  /**
   * Start list item mode
   * Note: Returns handled: true and newMode so we switch to List mode
   * The '-' character will be skipped (not part of content)
   */
  startList(context: ReducerContext): ReducerResult {
    // Don't create block yet, wait for space or task pattern
    // handled: true means the '-' character is consumed (skipped)
    context.taskListChecked = null;  // Reset task list state
    return { diffs: [], handled: true, newMode: ParseMode.List };
  }

  /**
   * Main processing logic
   */
  process(char: string, context: ReducerContext): ReducerResult {
    if (context.mode !== ParseMode.List) {
      return this.notHandled();
    }

    const diffs: BlockDiff[] = [];
    const state = context.taskListChecked as string | null;

    // Handle newline - end list item mode
    if (char === "\n") {
      // If we were in the middle of parsing task list pattern, fall back
      if (state !== null && !context.currentBlock) {
        // Build fallback text based on state
        let fallbackText = "-";
        if (state === 'space_seen') fallbackText += " ";
        else if (state === 'bracket_seen') fallbackText += " [";
        else if (state === 'unchecked') fallbackText += " [ ";
        else if (state === 'checked') fallbackText += " [x";
        else if (state === 'close_seen_unchecked') fallbackText += " [ ]";
        else if (state === 'close_seen_checked') fallbackText += " [x]";
        
        context.taskListChecked = null;
        context.mode = ParseMode.Paragraph;
        
        const newDiffs = this.appendToParagraph(fallbackText, context);
        diffs.push(...newDiffs);
        return this.withDiffs(...diffs);
      }
      
      context.mode = ParseMode.Paragraph;
      context.currentBlock = null;
      context.taskListChecked = null;
      return this.noChange();
    }

    // If we already have a block, just append to it
    if (context.currentBlock) {
      this.appendToCurrentBlock(char, context);
      const patch = this.emitPatch(context);
      if (patch) {
        diffs.push(patch);
      }
      return this.withDiffs(...diffs);
    }

    // State machine for task list parsing
    if (state === null) {
      // Just seen '-', waiting for space
      if (char === " ") {
        context.taskListChecked = 'space_seen';
        return this.noChange();
      }
      // Not a space, fall back to regular list
      return this.fallbackToRegularList("", char, context, diffs);
    }

    if (state === 'space_seen') {
      // Seen "- ", waiting for '['
      if (char === "[") {
        context.taskListChecked = 'bracket_seen';
        return this.noChange();
      }
      // Not '[', fall back to regular list with space prefix
      return this.fallbackToRegularList(" ", char, context, diffs);
    }

    if (state === 'bracket_seen') {
      // Seen "- [", waiting for ' ', 'x', or 'X'
      if (char === " ") {
        context.taskListChecked = 'unchecked';
        return this.noChange();
      }
      if (char === "x" || char === "X") {
        context.taskListChecked = 'checked';
        return this.noChange();
      }
      // Unexpected char, fall back
      return this.fallbackToRegularList(" [", char, context, diffs);
    }

    if (state === 'unchecked') {
      // Seen "- [ ", waiting for ']'
      if (char === "]") {
        context.taskListChecked = 'close_seen_unchecked';
        return this.noChange();
      }
      // Unexpected char, fall back
      return this.fallbackToRegularList(" [ ", char, context, diffs);
    }

    if (state === 'checked') {
      // Seen "- [x" or "- [X", waiting for ']'
      if (char === "]") {
        context.taskListChecked = 'close_seen_checked';
        return this.noChange();
      }
      // Unexpected char, fall back
      return this.fallbackToRegularList(" [x", char, context, diffs);
    }

    if (state === 'close_seen_unchecked' || state === 'close_seen_checked') {
      // Seen "- [ ]" or "- [x]", waiting for space to confirm
      if (char === " ") {
        // Confirmed! Create task list item
        const checked = state === 'close_seen_checked';
        const block = this.createTaskListItemBlock(context, checked);
        diffs.push(this.createAppendDiff(block));
        return this.withDiffs(...diffs);
      }
      // Expected space after ']', fall back
      const prefix = state === 'close_seen_unchecked' ? " [ ]" : " [x]";
      return this.fallbackToRegularList(prefix, char, context, diffs);
    }

    // Unknown state, fall back
    return this.fallbackToRegularList("", char, context, diffs);
  }

  /**
   * Fall back to regular list item
   */
  private fallbackToRegularList(
    prefix: string, 
    char: string, 
    context: ReducerContext, 
    diffs: BlockDiff[]
  ): ReducerResult {
    context.taskListChecked = null;
    
    const block = this.createListItemBlock(context);
    block.text = prefix;  // Any collected prefix becomes content
    
    // Append current char
    this.appendToCurrentBlock(char, context);
    
    diffs.push(this.createAppendDiff(block));
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
    if (context.mode !== ParseMode.List) {
      return this.notHandled();
    }

    const ticks = "`".repeat(count);
    
    // If no current block yet, create a regular list item
    if (!context.currentBlock) {
      // Reset task list state since we're falling back
      context.taskListChecked = null;
      const block = this.createListItemBlock(context);
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
   * Create list item block
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

  /**
   * Create task list item block
   */
  private createTaskListItemBlock(context: ReducerContext, checked: boolean): TaskListItemBlock {
    const block: TaskListItemBlock = {
      id: context.nextBlockId++,
      type: "taskListItem",
      checked: checked,
      text: "",
    };

    context.blocks.push(block);
    context.currentBlock = block;
    context.taskListChecked = null;  // Reset for next item
    return block;
  }
}
