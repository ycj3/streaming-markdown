import { BlockDiff } from "../protocol";
import { handleIncompleteInlineCode } from "../utils/inline-code-handler";
import { BaseReducer } from "./BaseReducer";
import {
  ParagraphReducer,
  HeadingReducer,
  CodeFenceReducer,
  InlineCodeReducer,
  ListReducer,
  OrderedListReducer,
  BlockquoteReducer,
  HorizontalRuleReducer,
} from "./reducers";
import { ReducerRegistry, createDefaultRegistry } from "./registry";
import {
  ReducerContext,
  ReducerResult,
  ParseMode,
  createInitialContext,
} from "./types";

export { ParseMode, ReducerContext, ReducerResult, IReducer } from "./types";
export { ReducerRegistry } from "./registry";
export { BaseReducer } from "./BaseReducer";
export {
  ParagraphReducer,
  HeadingReducer,
  CodeFenceReducer,
  InlineCodeReducer,
  ListReducer,
  OrderedListReducer,
  BlockquoteReducer,
  HorizontalRuleReducer,
} from "./reducers";

/**
 * BlockReducer - Strategy pattern based streaming Markdown parser
 *
 * Architecture:
 * 1. Uses strategy pattern, each parse mode corresponds to a Reducer
 * 2. Registry manages all Reducers uniformly
 * 3. Main dispatcher coordinates character routing
 *
 * Extension method:
 * 1. Create new Reducer class implementing IReducer interface
 * 2. Register new Reducer in registry
 * 3. No need to modify existing code
 *
 * Supported features:
 * - Paragraph
 * - Heading # ## ###
 * - Code block ```lang\ncode\n```
 * - Inline code `code`
 */
export class BlockReducer {
  /** Reducer registry */
  private registry: ReducerRegistry;

  /** Parse context */
  private context: ReducerContext;

  /** Concrete Reducer instances (for special method calls) */
  private headingReducer: HeadingReducer;
  private codeFenceReducer: CodeFenceReducer;
  private inlineCodeReducer: InlineCodeReducer;
  private listReducer: ListReducer;
  private orderedListReducer: OrderedListReducer;
  private blockquoteReducer: BlockquoteReducer;
  private horizontalRuleReducer: HorizontalRuleReducer;

  constructor(registry?: ReducerRegistry) {
    // Initialize context
    this.context = createInitialContext();

    // Create concrete Reducer instances
    this.headingReducer = new HeadingReducer();
    this.codeFenceReducer = new CodeFenceReducer();
    this.inlineCodeReducer = new InlineCodeReducer();
    this.listReducer = new ListReducer();
    this.orderedListReducer = new OrderedListReducer();
    this.blockquoteReducer = new BlockquoteReducer();
    this.horizontalRuleReducer = new HorizontalRuleReducer();
    const paragraphReducer = new ParagraphReducer();

    // Use provided registry or create default
    this.registry =
      registry ||
      createDefaultRegistry(
        paragraphReducer,
        this.headingReducer,
        this.codeFenceReducer,
        this.inlineCodeReducer,
        this.listReducer,
        this.orderedListReducer,
        this.blockquoteReducer,
        this.horizontalRuleReducer
      );
  }

  /**
   * Process a single character
   *
   * Processing flow:
   * 1. If backtick, accumulate pendingBackticks
   * 2. If 3 backticks reached, trigger code fence handling
   * 3. Otherwise, flush pending backticks first
   * 4. Detect if mode switch is needed (triggers)
   * 5. Route to current mode's Reducer
   */
  push(char: string): BlockDiff[] {
    const diffs: BlockDiff[] = [];

    // Handle backtick accumulation
    if (char === "`") {
      this.context.pendingBackticks++;

      // 3 backticks reached - code fence trigger
      if (this.context.pendingBackticks === 3) {
        this.context.pendingBackticks = 0;  // Reset before handling to prevent flush
        const result = this.codeFenceReducer.handleFenceTrigger(this.context);
        diffs.push(...result.diffs);
        return diffs;
      }

      return diffs;
    }

    // Flush pending backticks
    if (this.context.pendingBackticks > 0) {
      const result = this.flushPendingBackticks();
      diffs.push(...result.diffs);

      // If mode changed after flushing backticks, continue processing current character
      // But in some cases, current character may need to be skipped
      if (result.handled && !this.shouldContinueProcessing(char)) {
        return diffs;
      }
    }

    // Detect mode switch triggers
    const triggerResult = this.checkTriggers(char);
    if (triggerResult) {
      diffs.push(...triggerResult.diffs);
      if (triggerResult.newMode) {
        this.context.mode = triggerResult.newMode;
      }

      // If trigger explicitly handled the character, don't continue
      // Otherwise, continue to let the current (possibly new) mode's reducer process it
      if (triggerResult.handled) {
        return diffs;
      }
    }

    // Route to current mode's Reducer
    const reducer = this.registry.getReducer(this.context.mode);
    if (reducer) {
      const result = reducer.process(char, this.context);
      diffs.push(...result.diffs);

      // Handle mode switch
      if (result.newMode && result.newMode !== this.context.mode) {
        this.context.mode = result.newMode;
      }
    }

    return diffs;
  }

  /**
   * Close parser, handle incomplete content
   */
  close(): BlockDiff[] {
    const diffs: BlockDiff[] = [];

    // Flush any pending backticks first
    if (this.context.pendingBackticks > 0) {
      const result = this.flushPendingBackticks();
      diffs.push(...result.diffs);
    }

    // Handle incomplete inline code
    if (
      this.context.mode === ParseMode.InlineCode &&
      this.context.currentBlock?.type === "inlineCode"
    ) {
      // Convert inline code to paragraph
      this.context.mode = ParseMode.Paragraph;
    }

    // Handle incomplete inline code markers in paragraph
    if (
      this.context.mode === ParseMode.Paragraph &&
      this.context.currentBlock?.type === "paragraph"
    ) {
      const originalText = this.context.currentBlock.text;
      const repairedText = handleIncompleteInlineCode(originalText);

      if (repairedText !== originalText) {
        this.context.currentBlock.text = repairedText;
        diffs.push({
          kind: "patch",
          id: this.context.currentBlock.id,
          block: { ...this.context.currentBlock },
        });
      }
    }

    // Reset state
    this.resetState();

    return diffs;
  }

  /**
   * Flush pending backticks
   */
  private flushPendingBackticks(): ReducerResult {
    const count = this.context.pendingBackticks;
    this.context.pendingBackticks = 0;

    // Try each Reducer's flushBackticks method
    const reducer = this.registry.getReducer(this.context.mode);
    if (reducer && reducer.flushBackticks) {
      const result = reducer.flushBackticks(count, this.context);
      if (result.handled) {
        return result;
      }
    }

    // Default handling: treat as normal text
    if (this.context.mode === ParseMode.Paragraph) {
      const paragraphReducer = this.registry.getReducer(
        ParseMode.Paragraph
      ) as ParagraphReducer;
      if (paragraphReducer) {
        return paragraphReducer.flushBackticks!(count, this.context);
      }
    }

    return { diffs: [], handled: false };
  }

  /**
   * Check if should continue processing current character
   */
  private shouldContinueProcessing(char: string): boolean {
    // After backtick flush, if current character is backtick, don't continue
    // Because it was already handled above
    return char !== "`";
  }

  /**
   * Check triggers
   * Returns processing result or null
   */
  private checkTriggers(char: string): ReducerResult | null {
    // Check heading trigger
    if (this.headingReducer.canStartHeading(char, this.context)) {
      return this.headingReducer.startHeading(this.context);
    }

    // Check horizontal rule trigger (before list, since --- could be confused with - list)
    if (this.horizontalRuleReducer.canStartHorizontalRule(char, this.context)) {
      return this.horizontalRuleReducer.startHorizontalRule(this.context, char);
    }

    // Check list trigger
    if (this.listReducer.canStartList(char, this.context)) {
      return this.listReducer.startList(this.context);
    }

    // Check ordered list trigger
    if (this.orderedListReducer.canStartOrderedList(char, this.context)) {
      return this.orderedListReducer.startOrderedList(this.context, char);
    }

    // Check blockquote trigger
    if (this.blockquoteReducer.canStartBlockquote(char, this.context)) {
      return this.blockquoteReducer.startBlockquote(this.context);
    }

    // Check inline code trigger
    if (this.inlineCodeReducer.canStartInlineCode(this.context)) {
      return this.inlineCodeReducer.startInlineCode(this.context);
    }

    return null;
  }

  /**
   * Reset state
   */
  private resetState(): void {
    this.context.currentBlock = null;
    this.context.mode = ParseMode.Paragraph;
    this.context.pendingBackticks = 0;
    this.context.languageBuffer = "";
    this.context.headingLevel = 0;
    this.context.orderedListNumber = 0;
    this.context.taskListChecked = null;
    this.context.hrDashCount = 0;
  }

  /**
   * Get current context (for debugging)
   */
  getContext(): ReducerContext {
    return { ...this.context };
  }

  /**
   * Get current mode (for debugging)
   */
  getCurrentMode(): ParseMode {
    return this.context.mode;
  }
}
