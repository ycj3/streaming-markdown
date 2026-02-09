import { Block, BlockDiff } from "../protocol";

/**
 * Parse mode enumeration
 * Each mode corresponds to a specific Reducer strategy
 */
export enum ParseMode {
  /** Normal paragraph text */
  Paragraph = "paragraph",
  /** Heading parsing */
  Heading = "heading",
  /** Code block fence start (parsing language identifier) */
  FenceStart = "fenceStart",
  /** Code block content */
  Code = "code",
  /** Inline code */
  InlineCode = "inlineCode",
  /** Unordered list item */
  List = "list",
  /** Ordered list item */
  OrderedList = "orderedList",
  /** Blockquote */
  Blockquote = "blockquote",
  /** Horizontal rule */
  HorizontalRule = "horizontalRule",
}

/**
 * Reducer context - contains all state shared across Reducers
 */
export interface ReducerContext {
  /** All parsed blocks */
  blocks: Block[];
  /** Currently active block being built */
  currentBlock: Block | null;
  /** Next block ID */
  nextBlockId: number;
  /** Current parse mode */
  mode: ParseMode;
  /** Number of pending backticks (to distinguish between `, ``, ```) */
  pendingBackticks: number;
  /** Code block language buffer */
  languageBuffer: string;
  /** Heading level */
  headingLevel: number;
  /** Ordered list item number buffer */
  orderedListNumber: number;
  /** Task list parsing state buffer (null, string state, or boolean for confirmed state) */
  taskListChecked: boolean | string | null;
  /** Horizontal rule dash counter */
  hrDashCount: number;
}

/**
 * Reducer processing result
 */
export interface ReducerResult {
  /** Generated diffs */
  diffs: BlockDiff[];
  /** Whether the character was handled (if true, dispatcher will not continue processing) */
  handled: boolean;
  /** New parse mode (if mode switch is needed) */
  newMode?: ParseMode;
}

/**
 * Reducer strategy interface
 * Each concrete Reducer must implement this interface
 */
export interface IReducer {
  /**
   * Process a single character
   * @param char - Input character
   * @param context - Current context
   * @returns Processing result
   */
  process(char: string, context: ReducerContext): ReducerResult;

  /**
   * Process pending backticks (flushed when non-backtick character arrives)
   * @param count - Number of pending backticks
   * @param context - Current context
   * @returns Processing result
   */
  flushBackticks?(count: number, context: ReducerContext): ReducerResult;

  /**
   * Close/cleanup resources (called when stream ends)
   * @param context - Current context
   * @returns Processing result
   */
  close?(context: ReducerContext): ReducerResult;
}

/**
 * Create initial context
 */
export function createInitialContext(): ReducerContext {
  return {
    blocks: [],
    currentBlock: null,
    nextBlockId: 0,
    mode: ParseMode.Paragraph,
    pendingBackticks: 0,
    languageBuffer: "",
    headingLevel: 0,
    orderedListNumber: 0,
    taskListChecked: null,
    hrDashCount: 0,
  };
}
