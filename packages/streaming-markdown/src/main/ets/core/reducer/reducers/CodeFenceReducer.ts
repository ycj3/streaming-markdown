import { BlockDiff, CodeBlock } from "../../protocol";
import { BaseReducer } from "../BaseReducer";
import { ReducerContext, ReducerResult, ParseMode } from "../types";

/**
 * CodeFenceReducer - Handles code block fences ```
 *
 * Responsibilities:
 * 1. Detect code block fence start (```)
 * 2. Parse language identifier (e.g., ```typescript)
 * 3. Collect code block content
 * 4. Detect code block fence end (```)
 *
 * State transitions:
 * Paragraph -> FenceStart (detected ```)
 * FenceStart -> Code (newline encountered)
 * Code -> Paragraph (detected ```)
 */
export class CodeFenceReducer extends BaseReducer {
  /**
   * Handle code fence trigger (called when pendingBackticks reaches 3)
   * This is an externally detected trigger point requiring special handling
   */
  handleFenceTrigger(context: ReducerContext): ReducerResult {
    const diffs: BlockDiff[] = [];

    // If already in a code block (or language parsing mode), close it
    if (context.mode === ParseMode.Code || context.mode === ParseMode.FenceStart) {
      this.closeCurrentBlock(context);
      return this.noChange();
    }

    // Start a new code block
    context.mode = ParseMode.FenceStart;
    context.languageBuffer = "";
    const appendDiff = this.createCodeBlock(context);
    diffs.push(appendDiff);

    return this.withDiffs(...diffs);
  }

  /**
   * Main processing logic
   */
  process(char: string, context: ReducerContext): ReducerResult {
    switch (context.mode) {
      case ParseMode.FenceStart:
        return this.handleFenceStart(char, context);
      case ParseMode.Code:
        return this.handleCodeContent(char, context);
      default:
        // Not within this reducer's scope
        return this.notHandled();
    }
  }

  /**
   * Handle fence start phase (parsing language identifier)
   * After ```, until newline is encountered
   */
  private handleFenceStart(char: string, context: ReducerContext): ReducerResult {
    const diffs: BlockDiff[] = [];

    if (char === "\n") {
      // Language identifier complete, enter code content mode
      this.finalizeLanguage(context, diffs);
      context.mode = ParseMode.Code;
    } else {
      // Collect language identifier
      context.languageBuffer += char;
    }

    return this.withDiffs(...diffs);
  }

  /**
   * Handle code content
   */
  private handleCodeContent(char: string, context: ReducerContext): ReducerResult {
    // Append to current code block
    this.appendToCurrentBlock(char, context);

    const patch = this.emitPatch(context);
    return patch
      ? this.withDiffs(patch)
      : this.noChange();
  }

  /**
   * Flush pending backticks (when non-backtick character arrives)
   * In code block mode, backticks are appended directly to content
   */
  flushBackticks(count: number, context: ReducerContext): ReducerResult {
    if (context.mode === ParseMode.Code || context.mode === ParseMode.FenceStart) {
      const ticks = "`".repeat(count);
      this.appendToCurrentBlock(ticks, context);

      const patch = this.emitPatch(context);
      return patch
        ? this.withDiffs(patch)
        : this.noChange();
    }
    return this.notHandled();
  }

  /**
   * Finalize language identifier setting
   */
  private finalizeLanguage(context: ReducerContext, diffs: BlockDiff[]): void {
    if (!context.currentBlock || context.currentBlock.type !== "code") return;

    const lang = context.languageBuffer.trim();
    if (!lang) return;

    (context.currentBlock as CodeBlock).lang = lang;

    // Emit patch with language included
    diffs.push({
      kind: "patch",
      id: context.currentBlock.id,
      block: { ...context.currentBlock },
    });
  }
}
