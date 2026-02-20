import { BlockReducer } from './reducer'
import { Block, BlockDiff } from './protocol'

/**
 * Streaming render mode
 * - char: character by character (default)
 * - word: word by word
 * - chunk: chunk/sentence by chunk
 */
export type StreamingMode = 'char' | 'word' | 'chunk'

/**
 * Stream configuration options
 */
export interface MarkdownStreamOptions {
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

type Listener = (diff: BlockDiff) => void

type CompleteListener = () => void

type ResetListener = () => void

/**
 * Stream state
 */
export type StreamingState = 'idle' | 'streaming' | 'paused' | 'completed'

export class MarkdownStream {
  private reducer: BlockReducer = new BlockReducer()
  private listeners: Listener[] = []
  private completeListeners: CompleteListener[] = []
  private resetListeners: ResetListener[] = []
  private mode: StreamingMode
  private interval: number

  private state: StreamingState = 'idle'
  private inputQueue: string = ''
  private buffer: string = ''
  private timer: number | null = null
  private isInputFinished: boolean = false

  constructor(options?: MarkdownStreamOptions) {
    this.mode = options?.mode ?? 'char'
    this.interval = options?.interval ?? 30
  }

  /**
   * Append new input chunk into stream queue
   */
  append(chunk: string) {
    if (chunk.length === 0) {
      return
    }

    if (this.state === 'completed') {
      this.reset()
    }

    this.inputQueue += chunk

    if (this.state === 'idle') {
      this.state = 'streaming'
      this.scheduleNext()
      return
    }

    if (this.state === 'streaming' && this.timer === null) {
      this.scheduleNext()
    }
  }

  /**
   * Mark input complete; stream will complete after queue drains
   */
  finish() {
    this.isInputFinished = true

    if (this.state === 'idle') {
      this.complete()
      return
    }

    if (this.state === 'streaming' && this.timer === null) {
      this.scheduleNext()
      return
    }

    if (this.state === 'paused' && this.inputQueue.length === 0 && this.buffer.length === 0) {
      this.complete()
    }
  }

  /**
   * Pause the stream processing
   */
  pause() {
    if (this.state === 'streaming') {
      this.clearTimer()
      this.state = 'paused'
    }
  }

  /**
   * Resume stream processing
   */
  resume() {
    if (this.state === 'paused') {
      this.state = 'streaming'
      this.scheduleNext()
    }
  }

  /**
   * Reset the stream to initial state
   */
  reset() {
    this.clearTimer()
    this.reducer = new BlockReducer()
    this.state = 'idle'
    this.inputQueue = ''
    this.buffer = ''
    this.isInputFinished = false
    this.resetListeners.forEach((listener) => listener())
  }

  /**
   * Get current stream state
   */
  getState(): StreamingState {
    return this.state
  }

  /**
   * Get current render mode
   */
  getMode(): StreamingMode {
    return this.mode
  }

  /**
   * Get current interval
   */
  getInterval(): number {
    return this.interval
  }

  /**
   * Set render interval
   */
  setInterval(interval: number) {
    this.interval = interval
  }

  private scheduleNext() {
    if (this.state !== 'streaming' || this.timer !== null) {
      return
    }

    this.timer = setTimeout(() => {
      this.timer = null
      this.renderNext()
    }, this.interval) as unknown as number
  }

  private renderNext() {
    if (this.state !== 'streaming') {
      return
    }

    if (this.mode === 'char') {
      this.renderCharTick()
    } else if (this.mode === 'word') {
      this.renderWordTick()
    } else {
      this.renderChunkTick()
    }

    if (this.state !== 'streaming') {
      return
    }

    if (this.inputQueue.length > 0) {
      this.scheduleNext()
      return
    }

    if (this.mode !== 'char' && this.buffer.length > 0) {
      if (this.isInputFinished) {
        this.flushBuffer()
        this.complete()
      }
      return
    }

    if (this.isInputFinished) {
      this.complete()
    }
  }

  private renderCharTick() {
    if (this.inputQueue.length === 0) {
      return
    }

    const char = this.inputQueue[0]
    this.inputQueue = this.inputQueue.slice(1)
    this.renderChar(char)
  }

  private renderWordTick() {
    this.renderBufferedTick((char: string) => this.isWordBoundary(char))
  }

  private renderChunkTick() {
    this.renderBufferedTick((char: string) => this.isChunkBoundary(char))
  }

  private renderBufferedTick(isBoundary: (char: string) => boolean) {
    if (this.inputQueue.length === 0) {
      return
    }

    const char = this.inputQueue[0]
    this.inputQueue = this.inputQueue.slice(1)
    this.buffer += char

    if (isBoundary(char)) {
      this.flushBuffer()
    }
  }

  private renderChar(char: string) {
    const diffs = this.reducer.push(char)
    diffs.forEach((diff) => {
      this.listeners.forEach((listener) => listener(diff))
    })
  }

  private flushBuffer() {
    if (this.buffer.length === 0) {
      return
    }

    for (const char of this.buffer) {
      this.renderChar(char)
    }

    this.buffer = ''
  }

  private complete() {
    this.clearTimer()
    this.flushBuffer()

    const diffs = this.reducer.close()
    diffs.forEach((diff) => {
      this.listeners.forEach((listener) => listener(diff))
    })

    this.state = 'completed'
    this.completeListeners.forEach((listener) => listener())
  }

  private clearTimer() {
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  private isWordBoundary(char: string): boolean {
    return char === ' ' || char === '\n' || char === '\t' || char === '\r'
  }

  private isChunkBoundary(char: string): boolean {
    const boundaries = new Set(['\n', '\r', '.', '!', '?', '。', '！', '？', ',', '，', ';', '；', ':', '：'])
    return boundaries.has(char)
  }

  /**
   * Subscribe to block diff updates
   */
  subscribe(listener: Listener): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((item) => item !== listener)
    }
  }

  /**
   * Subscribe to completion event
   */
  onComplete(listener: CompleteListener): () => void {
    this.completeListeners.push(listener)
    return () => {
      this.completeListeners = this.completeListeners.filter((item) => item !== listener)
    }
  }

  /**
   * Subscribe to reset event
   */
  onReset(listener: ResetListener): () => void {
    this.resetListeners.push(listener)
    return () => {
      this.resetListeners = this.resetListeners.filter((item) => item !== listener)
    }
  }

  /**
   * Get current rendered blocks snapshot
   */
  getBlocks(): Block[] {
    return this.reducer.getContext().blocks.map((block) => ({ ...block }))
  }
}

export function createMarkdownStream(options?: MarkdownStreamOptions): MarkdownStream {
  return new MarkdownStream(options)
}
