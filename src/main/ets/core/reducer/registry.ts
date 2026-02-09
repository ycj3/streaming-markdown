import { IReducer, ParseMode } from "./types";
import { ListReducer } from "./reducers/ListReducer";
import { OrderedListReducer } from "./reducers/OrderedListReducer";
import { BlockquoteReducer } from "./reducers/BlockquoteReducer";
import { HorizontalRuleReducer } from "./reducers/HorizontalRuleReducer";

/**
 * Reducer registry
 * Manages all Reducer strategies uniformly
 *
 * Design goals:
 * 1. Centralized management of all Reducers
 * 2. Support dynamic registration/unregistration of Reducers (for easy extension)
 * 3. Fast lookup of Reducers by ParseMode
 */
export class ReducerRegistry {
  /** Mapping from mode to Reducer */
  private modeToReducer: Map<ParseMode, IReducer> = new Map();

  /** Special trigger Reducers (e.g., heading detection, inline code detection, etc.) */
  private triggerReducers: IReducer[] = [];

  /**
   * Register a Reducer for a specific mode
   */
  register(mode: ParseMode, reducer: IReducer): void {
    this.modeToReducer.set(mode, reducer);
  }

  /**
   * Register a trigger Reducer
   * Trigger Reducers are used to detect whether mode switching is needed
   */
  registerTrigger(reducer: IReducer): void {
    this.triggerReducers.push(reducer);
  }

  /**
   * Unregister Reducer for a specific mode
   */
  unregister(mode: ParseMode): void {
    this.modeToReducer.delete(mode);
  }

  /**
   * Get Reducer for a specific mode
   */
  getReducer(mode: ParseMode): IReducer | undefined {
    return this.modeToReducer.get(mode);
  }

  /**
   * Get all trigger Reducers
   */
  getTriggerReducers(): IReducer[] {
    return [...this.triggerReducers];
  }

  /**
   * Check if a mode is registered
   */
  hasReducer(mode: ParseMode): boolean {
    return this.modeToReducer.has(mode);
  }

  /**
   * Get all registered modes
   */
  getRegisteredModes(): ParseMode[] {
    return Array.from(this.modeToReducer.keys());
  }
}

/**
 * Create default Reducer registry
 * Pre-configured with all standard Markdown Reducers
 */
export function createDefaultRegistry(
  paragraphReducer: IReducer,
  headingReducer: IReducer,
  codeFenceReducer: IReducer,
  inlineCodeReducer: IReducer,
  listReducer: IReducer,
  orderedListReducer: IReducer,
  blockquoteReducer: IReducer,
  horizontalRuleReducer: IReducer
): ReducerRegistry {
  const registry = new ReducerRegistry();

  // Register mode handlers
  registry.register(ParseMode.Paragraph, paragraphReducer);
  registry.register(ParseMode.Heading, headingReducer);
  registry.register(ParseMode.FenceStart, codeFenceReducer);
  registry.register(ParseMode.Code, codeFenceReducer);
  registry.register(ParseMode.InlineCode, inlineCodeReducer);
  registry.register(ParseMode.List, listReducer);
  registry.register(ParseMode.OrderedList, orderedListReducer);
  registry.register(ParseMode.Blockquote, blockquoteReducer);
  registry.register(ParseMode.HorizontalRule, horizontalRuleReducer);

  // Register triggers (sorted by priority)
  // Note: trigger order is important
  registry.registerTrigger(headingReducer);
  registry.registerTrigger(inlineCodeReducer);
  registry.registerTrigger(codeFenceReducer);
  registry.registerTrigger(listReducer);
  registry.registerTrigger(orderedListReducer);
  registry.registerTrigger(blockquoteReducer);
  registry.registerTrigger(horizontalRuleReducer);

  return registry;
}
