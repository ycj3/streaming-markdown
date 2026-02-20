import { Block, BlockDiff, ParagraphBlock, CodeBlock } from "../protocol";
import { ReducerContext, ReducerResult, IReducer, ParseMode } from "./types";

/**
 * Reducer base class
 * Provides common utility methods that concrete Reducers can inherit or use via composition
 */
export abstract class BaseReducer implements IReducer {
  /**
   * Abstract method: process character
   */
  abstract process(char: string, context: ReducerContext): ReducerResult;

  /**
   * Create a new block
   */
  protected createBlock(
    type: "paragraph" | "code" | "inlineCode",
    context: ReducerContext
  ): Block {
    const block: Block = {
      id: context.nextBlockId++,
      type,
      text: "",
    } as Block;

    context.blocks.push(block);
    context.currentBlock = block;
    return block;
  }

  /**
   * Create a paragraph block and return append diff
   */
  protected createParagraphBlock(context: ReducerContext): BlockDiff {
    const block: ParagraphBlock = {
      id: context.nextBlockId++,
      type: "paragraph",
      text: "",
    };

    context.blocks.push(block);
    context.currentBlock = block;
    return {
      kind: "append",
      block: { ...block },
    };
  }

  /**
   * Create a code block and return append diff
   */
  protected createCodeBlock(context: ReducerContext): BlockDiff {
    const block: CodeBlock = {
      id: context.nextBlockId++,
      type: "code",
      text: "",
    };

    context.blocks.push(block);
    context.currentBlock = block;
    return {
      kind: "append",
      block: { ...block },
    };
  }

  /**
   * Append text to paragraph
   * Creates new paragraph if needed, returns appropriate diffs
   */
  protected appendToParagraph(text: string, context: ReducerContext): BlockDiff[] {
    const diffs: BlockDiff[] = [];
    const needNewBlock = !context.currentBlock || context.currentBlock.type !== "paragraph";
    
    if (needNewBlock) {
      // Create new paragraph and emit append diff
      diffs.push(this.createParagraphBlock(context));
    }
    
    // Now currentBlock must be a paragraph
    context.currentBlock!.text += text;
    
    // Emit patch diff for the update
    diffs.push({
      kind: "patch",
      id: context.currentBlock!.id,
      block: { ...context.currentBlock! },
    });
    
    return diffs;
  }

  /**
   * Append text to current block
   */
  protected appendToCurrentBlock(text: string, context: ReducerContext): void {
    if (!context.currentBlock) return;
    context.currentBlock.text += text;
  }

  /**
   * Emit patch diff for current block
   */
  protected emitPatch(context: ReducerContext): BlockDiff | null {
    if (!context.currentBlock) return null;
    return {
      kind: "patch",
      id: context.currentBlock.id,
      block: { ...context.currentBlock },
    };
  }

  /**
   * Close current block and return to paragraph mode
   */
  protected closeCurrentBlock(context: ReducerContext): void {
    context.currentBlock = null;
    context.mode = ParseMode.Paragraph;
    context.languageBuffer = "";
  }

  /**
   * Create append diff for a block
   */
  protected createAppendDiff(block: Block): BlockDiff {
    return {
      kind: "append",
      block: { ...block },
    };
  }

  /**
   * Create empty result
   */
  protected noChange(): ReducerResult {
    return { diffs: [], handled: true };
  }

  /**
   * Create result with diffs
   */
  protected withDiffs(...diffs: BlockDiff[]): ReducerResult {
    return { diffs, handled: true };
  }

  /**
   * Create unhandled result (let other reducer handle it)
   */
  protected notHandled(): ReducerResult {
    return { diffs: [], handled: false };
  }

  /**
   * Switch to new mode
   */
  protected switchTo(mode: ParseMode, diffs: BlockDiff[] = []): ReducerResult {
    return { diffs, handled: true, newMode: mode };
  }
}
