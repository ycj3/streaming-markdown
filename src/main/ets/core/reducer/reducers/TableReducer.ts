import { BlockDiff, TableBlock } from "../../protocol";
import { BaseReducer } from "../BaseReducer";
import { ReducerContext, ReducerResult, ParseMode } from "../types";

/**
 * TableReducer - Handles Markdown tables
 *
 * Markdown table syntax:
 * | Header 1 | Header 2 |
 * |----------|----------|
 * | Cell 1   | Cell 2   |
 * | Cell 3   | Cell 4   |
 *
 * Responsibilities:
 * 1. Detect table start (| at line start)
 * 2. Parse header row (first row)
 * 3. Parse separator row (|---|) to determine column count and alignment
 * 4. Parse data rows
 * 5. End table on empty line or non-table line
 *
 * State machine:
 * - tableState: 'header' -> 'separator' -> 'rows'
 * - Transitions happen on newline
 * - Table ends when encountering empty line or line not starting with |
 */
export class TableReducer extends BaseReducer {
  /**
   * Check if table mode can start
   * Must be at line start and character is |
   */
  canStartTable(char: string, context: ReducerContext): boolean {
    const result = (
      char === "|" &&
      context.mode === ParseMode.Paragraph &&
      (!context.currentBlock || context.currentBlock.text === "")
    );
    if (char === "|") {
      console.log(`[Table] canStartTable: char='${char}', mode=${context.mode}, currentBlock=${context.currentBlock?.type}, text='${context.currentBlock?.text}', result=${result}`);
    }
    return result;
  }

  /**
   * Start table mode
   * Returns handled: true so the '|' is consumed and not part of content
   */
  startTable(context: ReducerContext): ReducerResult {
    console.log(`[Table] startTable called!`);
    // Initialize table parsing state
    context.tableState = 'header';
    context.tableHeaders = [];
    context.tableAlignments = [];
    context.tableRows = [];
    context.tableCurrentRow = [];
    context.tableCellBuffer = '';
    return { diffs: [], handled: true, newMode: ParseMode.Table };
  }

  /**
   * Main processing logic
   */
  process(char: string, context: ReducerContext): ReducerResult {
    if (char === '|' || char === '\n') {
      console.log(`[Table] process: char='${JSON.stringify(char)}', state=${context.tableState}, buffer='${context.tableCellBuffer.substring(0, 20)}', rows=${context.tableRows.length}`);
    }
    if (context.mode !== ParseMode.Table) {
      console.log(`[Table] process: not in Table mode, returning notHandled`);
      return this.notHandled();
    }

    const diffs: BlockDiff[] = [];
    const state = context.tableState;

    // Handle newline - transition between table states
    if (char === "\n") {
      return this.handleNewline(context, diffs);
    }

    // Handle cell delimiter
    if (char === "|") {
      return this.handleCellDelimiter(context, diffs);
    }

    // Handle escape character for pipe
    if (char === "\\") {
      // Mark that next character should be treated literally
      context.tableCellBuffer += char;
      return this.noChange();
    }

    // Accumulate cell content
    context.tableCellBuffer += char;
    return this.noChange();
  }

  /**
   * Handle newline - transition between table states
   */
  private handleNewline(context: ReducerContext, diffs: BlockDiff[]): ReducerResult {
    console.log(`[Table] Row Processed. Total Rows now: ${context.tableRows.length}. Next State: ${context.tableState}`);
    const state = context.tableState;

    // Save current cell content before processing newline
    if (state === 'header') {
      // End of header row, save last cell
      const hasContent = context.tableCellBuffer.length > 0;
      console.log(`[Table] handleNewline header: hasContent=${hasContent}, buffer='${context.tableCellBuffer}', current headers=${context.tableHeaders.length}`);
      if (hasContent) {
        const content = this.trimCellContent(context.tableCellBuffer);
        context.tableHeaders.push(content);
        console.log(`[Table] handleNewline pushed header: '${content}'`);
      }
      // If we have no headers at all, this is not a valid table row, fall back
      if (context.tableHeaders.length === 0) {
        console.log(`[Table] handleNewline no headers, falling back`);
        return this.fallbackToParagraph(context, diffs);
      }
      context.tableCellBuffer = '';
      context.tableState = 'separator';
      console.log(`[Table] transitioning to separator state, headers=${context.tableHeaders.length}`);
      return this.noChange();
    }

    if (state === 'separator') {
      // End of separator row, parse alignments
      const hasContent = context.tableCellBuffer.length > 0;
      console.log(`[Table] handleNewline separator: hasContent=${hasContent}, buffer='${context.tableCellBuffer}', current alignments=${context.tableAlignments.length}`);
      if (hasContent) {
        const alignment = this.parseAlignment(context.tableCellBuffer);
        context.tableAlignments.push(alignment);
        console.log(`[Table] handleNewline pushed alignment: ${alignment}`);
      }
      // If we have alignments from handleCellDelimiter but the last one wasn't pushed
      // (because the row ended with |), we need to handle this case
      // The handleCellDelimiter already pushed alignments for each |, so we just need to check count
      context.tableCellBuffer = '';

      // Validate separator row matches header column count
      console.log(`[Table] validating: alignments=${context.tableAlignments.length}, headers=${context.tableHeaders.length}`);
      if (context.tableAlignments.length !== context.tableHeaders.length) {
        // Not a valid table, fall back to paragraph
        console.log(`[Table] fallback: alignments=${context.tableAlignments.length}, headers=${context.tableHeaders.length}`);
        return this.fallbackToParagraph(context, diffs);
      }

      context.tableState = 'rows';
      console.log(`[Table] transitioning to rows state`);
      return this.noChange();
    }

    if (state === 'rows') {
      console.log(`[Table] handleNewline rows: buffer='${context.tableCellBuffer}', currentRow=[${context.tableCurrentRow.join(', ')}], headers=${context.tableHeaders.length}`);
      const hasContent = context.tableCellBuffer.length > 0;
      if (hasContent) {
        context.tableCurrentRow.push(this.trimCellContent(context.tableCellBuffer));
        console.log(`[Table] pushed last cell, row=[${context.tableCurrentRow.join(', ')}]`);
      }

      if (context.tableCurrentRow.length > 0) {
        // 补齐单元格数量
        while (context.tableCurrentRow.length < context.tableHeaders.length) {
          context.tableCurrentRow.push('');
        }
        context.tableRows.push([...context.tableCurrentRow]);
        console.log(`[Table] pushed row to tableRows! total=${context.tableRows.length}, cells=[${context.tableCurrentRow.join(', ')}]`);

        // 关键：重置当前行，准备接收下一行数据
        context.tableCurrentRow = [];
        context.tableCellBuffer = '';
      } else {
        console.log(`[Table] currentRow empty, not pushing row`);
      }

      const patch = this.updateTableBlock(context);
      if (patch) {
        diffs.push(patch);
        console.log(`[Table] updateTableBlock returned patch`);
      }

      // 显式保持 Table 模式
      return { ...this.withDiffs(...diffs), newMode: ParseMode.Table };
    }

    return this.noChange();
  }

  /**
   * Handle cell delimiter (|)
   * 
   * Markdown table syntax: | cell1 | cell2 | cell3 |
   * The leading | starts a new cell, the trailing | ends the row
   * 
   * Logic:
   * - Leading | with empty buffer: don't push (start of row marker)
   * - | with non-empty buffer: push buffer content, reset buffer
   * - Consecutive ||: push empty string for empty cell
   */
  private handleCellDelimiter(context: ReducerContext, diffs: BlockDiff[]): ReducerResult {
    const state = context.tableState;
    const rawBuffer = context.tableCellBuffer;
    const hasContent = rawBuffer.length > 0;

    if (state === 'header') {
      const cellCount = context.tableHeaders.length;
      console.log(`[Table] handleCellDelimiter header: hasContent=${hasContent}, cellCount=${cellCount}, buffer='${rawBuffer}'`);
      if (hasContent) {
        // |content| - push the content
        const content = this.trimCellContent(rawBuffer);
        context.tableHeaders.push(content);
        context.tableCellBuffer = '';
        console.log(`[Table] pushed header: '${content}', headers now has ${context.tableHeaders.length} items`);
      } else if (cellCount > 0) {
        // || - consecutive delimiter, push empty cell
        context.tableHeaders.push('');
        console.log(`[Table] pushed empty header, headers now has ${context.tableHeaders.length} items`);
      } else {
        console.log(`[Table] leading | in header, nothing pushed`);
      }
      // Leading | with empty buffer and no cells - do nothing (row start marker)
      return this.noChange();
    }

    if (state === 'separator') {
      const cellCount = context.tableAlignments.length;
      console.log(`[Table] handleCellDelimiter separator: hasContent=${hasContent}, cellCount=${cellCount}, buffer='${rawBuffer}'`);
      if (hasContent) {
        // |content| - push the alignment
        const alignment = this.parseAlignment(rawBuffer);
        context.tableAlignments.push(alignment);
        context.tableCellBuffer = '';
        console.log(`[Table] pushed alignment: ${alignment}, alignments now has ${context.tableAlignments.length} items`);
      } else if (cellCount > 0) {
        // || - consecutive delimiter, push default alignment
        context.tableAlignments.push(null);
        console.log(`[Table] pushed null alignment, alignments now has ${context.tableAlignments.length} items`);
      } else {
        console.log(`[Table] leading | in separator, nothing pushed`);
      }
      // Leading | - do nothing
      return this.noChange();
    }

    if (state === 'rows') {
      const cellCount = context.tableCurrentRow.length;
      console.log(`[Table] handleCellDelimiter rows: hasContent=${hasContent}, cellCount=${cellCount}, buffer='${rawBuffer}'`);
      if (hasContent) {
        // |content| - push the content
        const content = this.trimCellContent(rawBuffer);
        context.tableCurrentRow.push(content);
        context.tableCellBuffer = '';
        console.log(`[Table] pushed cell content: '${content}', row now has ${context.tableCurrentRow.length} cells`);
      } else if (cellCount > 0) {
        // || - consecutive delimiter, push empty cell
        context.tableCurrentRow.push('');
        console.log(`[Table] pushed empty cell, row now has ${context.tableCurrentRow.length} cells`);
      } else {
        console.log(`[Table] leading |, nothing pushed`);
      }
      // Leading | - do nothing
      return this.noChange();
    }

    return this.noChange();
  }

  /**
   * Trim cell content (remove leading/trailing whitespace)
   */
  private trimCellContent(content: string): string {
    return content.trim();
  }

  /**
   * Parse alignment from separator cell content
   * |:---| left, |:---:| center, |---:| right, |---| default (left)
   */
  private parseAlignment(content: string): 'left' | 'center' | 'right' | null {
    const trimmed = content.trim();
    
    // Must contain at least 3 dashes
    if (!trimmed.replace(/[:|]/g, '').match(/^-+$/)) {
      return null;
    }

    const leftColon = trimmed.startsWith(':');
    const rightColon = trimmed.endsWith(':');

    if (leftColon && rightColon) {
      return 'center';
    } else if (rightColon) {
      return 'right';
    } else if (leftColon) {
      return 'left';
    }
    return null; // default left
  }

  /**
   * Create or update table block
   */
  private updateTableBlock(context: ReducerContext): BlockDiff | null {
    if (context.tableHeaders.length === 0) {
      console.log(`[Table] updateTableBlock: no headers, returning null`);
      return null;
    }

    console.log(`[Table] updateTableBlock: headers=${context.tableHeaders.length}, rows=${context.tableRows.length}`);
    console.log(`[Table] headers: [${context.tableHeaders.join(', ')}]`);
    console.log(`[Table] rows: ${JSON.stringify(context.tableRows)}`);

    // Check if we already have a table block
    if (context.currentBlock?.type === 'table') {
      // Update existing block - create completely new object to avoid reference issues
      const block = context.currentBlock as TableBlock;
      const updatedBlock: TableBlock = {
        id: block.id,
        type: 'table',
        headers: [...context.tableHeaders],
        alignments: [...context.tableAlignments],
        rows: context.tableRows.map(row => [...row]),
        text: ""
      };
      
      // Update context.currentBlock to the new object
      context.currentBlock = updatedBlock;
      
      console.log(`[Table] patching block id=${block.id}, rows=${updatedBlock.rows.length}`);
      return {
        kind: 'patch',
        id: block.id,
        block: updatedBlock,
      };
    }

    // Create new table block
    const block: TableBlock = {
      id: context.nextBlockId++,
      type: 'table',
      headers: [...context.tableHeaders],
      alignments: [...context.tableAlignments],
      rows: context.tableRows.map(row => [...row]),
      text: ""
    };

    context.blocks.push(block);
    context.currentBlock = block;

    console.log(`[Table] appending new block id=${block.id}`);
    return {
      kind: 'append',
      block: { ...block },
    };
  }

  /**
   * Fall back to paragraph mode when table parsing fails
   */
  private fallbackToParagraph(context: ReducerContext, diffs: BlockDiff[]): ReducerResult {
    console.log(`[Table] FALLBACK to paragraph! headers=${context.tableHeaders.length}, alignments=${context.tableAlignments.length}`);
    // Build fallback text from what we've collected
    let fallbackText = '|' + context.tableHeaders.join('|') + '|\n';
    
    if (context.tableAlignments.length > 0) {
      fallbackText += '|' + context.tableAlignments.map(a => '---').join('|') + '|\n';
    }

    // Reset table state
    context.tableState = null;
    context.tableHeaders = [];
    context.tableAlignments = [];
    context.tableRows = [];
    context.tableCurrentRow = [];
    context.tableCellBuffer = '';

    // Switch to paragraph mode
    context.mode = ParseMode.Paragraph;

    // Append fallback text as paragraph
    const newDiffs = this.appendToParagraph(fallbackText, context);
    diffs.push(...newDiffs);

    return this.withDiffs(...diffs);
  }

  /**
   * Check if current line can continue the table
   * Called by BlockReducer to check if we should stay in table mode
   */
  canContinueTable(char: string, context: ReducerContext): boolean {
    if (context.mode !== ParseMode.Table) return false;

    // 如果当前还在表格的中间状态（header 或 separator），绝对不能中断
    if (context.tableState === 'header' || context.tableState === 'separator') {
      return true;
    }

    // 只有当 buffer 为空（即新行开始）且字符不是 '|' 时才考虑结束
    // 允许换行符通过，因为 handleNewline 会处理它
    if (context.tableCellBuffer === '' && context.tableCurrentRow.length === 0) {
      if (char === '\n') return true; // 允许进入 handleNewline 处理连续行
      if (char !== '|') return false;
    }

    return true;
  }

  /**
   * End table mode and close current block
   */
  endTable(context: ReducerContext): ReducerResult {
    const diffs: BlockDiff[] = [];

    // Flush any remaining content in current cell
    if (context.tableCellBuffer !== '' || context.tableCurrentRow.length > 0) {
      const hasContent = context.tableCellBuffer.length > 0;
      if (hasContent) {
        context.tableCurrentRow.push(this.trimCellContent(context.tableCellBuffer));
      }
      
      if (context.tableCurrentRow.length > 0) {
        // Pad row to match column count
        while (context.tableCurrentRow.length < context.tableHeaders.length) {
          context.tableCurrentRow.push('');
        }
        context.tableRows.push([...context.tableCurrentRow]);
      }
      
      // Final update
      const patch = this.updateTableBlock(context);
      if (patch) {
        diffs.push(patch);
      }
    }

    // Reset table state
    context.tableState = null;
    context.tableHeaders = [];
    context.tableAlignments = [];
    context.tableRows = [];
    context.tableCurrentRow = [];
    context.tableCellBuffer = '';

    // Close current block and return to paragraph mode
    this.closeCurrentBlock(context);

    return this.withDiffs(...diffs);
  }

  /**
   * Flush pending backticks
   */
  flushBackticks(count: number, context: ReducerContext): ReducerResult {
    if (context.mode !== ParseMode.Table) {
      return this.notHandled();
    }

    // Append backticks to current cell buffer
    const ticks = "`".repeat(count);
    context.tableCellBuffer += ticks;
    
    return this.noChange();
  }

  /**
   * Close handling
   */
  close(context: ReducerContext): ReducerResult {
    if (context.mode !== ParseMode.Table) {
      return this.notHandled();
    }

    return this.endTable(context);
  }
}
