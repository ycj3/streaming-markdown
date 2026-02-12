import { BlockReducer } from "./reducer";
import { BlockDiff } from "./protocol";

/**
 * Streaming render mode
 * - char: character by character (default)
 * - word: word by word
 * - chunk: chunk/sentence by chunk
 */
export type StreamingMode = 'char' | 'word' | 'chunk'

/**
 * Controller configuration options
 */
export interface StreamingMarkdownOptions {
  /**
   * Streaming render mode, defaults to 'char'
   * - char: character by character, finest granularity
   * - word: word by word, flush on whitespace
   * - chunk: chunk by chunk, flush on punctuation or newline
   */
  mode?: StreamingMode
  /**
   * Render interval in milliseconds, defaults to 30ms
   */
  interval?: number
}

type Listener = (diff: BlockDiff) => void;
type CompleteListener = () => void;

/**
 * Streaming state
 */
export type StreamingState = 'idle' | 'streaming' | 'paused' | 'completed'

export class StreamingMarkdownController {
  private reducer = new BlockReducer();
  private listeners: Listener[] = [];
  private completeListeners: CompleteListener[] = [];
  private mode: StreamingMode;
  private interval: number;
  
  // Streaming state
  private state: StreamingState = 'idle';
  private text: string = '';
  private position: number = 0;
  private timer: number | null = null;
  
  // Buffer for word/chunk modes
  private buffer: string = '';

  constructor(options?: StreamingMarkdownOptions) {
    this.mode = options?.mode ?? 'char';
    this.interval = options?.interval ?? 30;
  }

  /**
   * Start streaming the text content.
   * This will automatically handle the rendering based on mode and interval.
   * 
   * @param text - Text content to stream
   */
  start(text: string) {
    if (this.state === 'streaming') {
      this.stop();
    }
    
    this.text = text;
    this.position = 0;
    this.buffer = '';
    this.state = 'streaming';
    
    this.scheduleNext();
  }

  /**
   * Pause the streaming
   */
  pause() {
    if (this.state === 'streaming') {
      this.clearTimer();
      this.state = 'paused';
    }
  }

  /**
   * Resume the streaming
   */
  resume() {
    if (this.state === 'paused') {
      this.state = 'streaming';
      this.scheduleNext();
    }
  }

  /**
   * Stop the streaming and reset state
   */
  stop() {
    this.clearTimer();
    this.state = 'idle';
    this.position = 0;
    this.buffer = '';
  }

  /**
   * Get current streaming state
   */
  getState(): StreamingState {
    return this.state;
  }

  /**
   * Get current render mode
   */
  getMode(): StreamingMode {
    return this.mode;
  }

  /**
   * Get current interval
   */
  getInterval(): number {
    return this.interval;
  }

  /**
   * Set render interval
   */
  setInterval(interval: number) {
    this.interval = interval;
  }

  /**
   * Schedule the next render tick
   */
  private scheduleNext() {
    if (this.state !== 'streaming') {
      return;
    }
    
    this.timer = setTimeout(() => {
      this.renderNext();
    }, this.interval) as unknown as number;
  }

  /**
   * Render the next chunk based on mode
   */
  private renderNext() {
    if (this.position >= this.text.length) {
      // Flush remaining buffer
      this.flushBuffer();
      this.complete();
      return;
    }

    const char = this.text.charAt(this.position);
    this.position++;

    if (this.mode === 'char') {
      // Char mode: render immediately
      this.renderChar(char);
      this.scheduleNext();
    } else if (this.mode === 'word') {
      // Word mode: accumulate until boundary
      this.buffer += char;
      if (this.isWordBoundary(char)) {
        this.flushBuffer();
      }
      this.scheduleNext();
    } else if (this.mode === 'chunk') {
      // Chunk mode: accumulate until punctuation
      this.buffer += char;
      if (this.isChunkBoundary(char)) {
        this.flushBuffer();
      }
      this.scheduleNext();
    }
  }

  /**
   * Render a single character through the reducer
   */
  private renderChar(char: string) {
    const diffs = this.reducer.push(char);
    diffs.forEach((diff) => {
      this.listeners.forEach((l) => l(diff));
    });
  }

  /**
   * Flush buffer content immediately
   */
  private flushBuffer() {
    if (this.buffer.length === 0) {
      return;
    }
    for (const char of this.buffer) {
      this.renderChar(char);
    }
    this.buffer = '';
  }

  /**
   * Complete the streaming
   */
  private complete() {
    this.clearTimer();
    this.state = 'completed';
    
    const diffs = this.reducer.close();
    diffs.forEach((diff) => {
      this.listeners.forEach((l) => l(diff));
    });
    
    this.completeListeners.forEach((l) => l());
  }

  /**
   * Clear the timer
   */
  private clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Check if character is a word boundary (space, newline, tab)
   */
  private isWordBoundary(char: string): boolean {
    return char === ' ' || char === '\n' || char === '\t' || char === '\r';
  }

  /**
   * Check if character is a chunk boundary (punctuation, newline)
   * Supported punctuation: . ! ? 。 ！ ？ , ， ; ： : 
   */
  private isChunkBoundary(char: string): boolean {
    const boundaries = new Set(['\n', '\r', '.', '!', '?', '。', '！', '？', ',', '，', ';', '；', ':', '：']);
    return boundaries.has(char);
  }

  /**
   * Subscribe to block diff updates
   */
  subscribe(listener: Listener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Subscribe to completion event
   */
  onComplete(listener: CompleteListener): () => void {
    this.completeListeners.push(listener);
    return () => {
      this.completeListeners = this.completeListeners.filter((l) => l !== listener);
    };
  }
}

export function createStreamingMarkdown(options?: StreamingMarkdownOptions): StreamingMarkdownController {
  return new StreamingMarkdownController(options);
}
