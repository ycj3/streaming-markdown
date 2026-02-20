import { UnifiedEvent, UnifiedEventListener } from './types'

export abstract class AdapterBase {
  private listeners: UnifiedEventListener[] = []
  private done: boolean = false

  onEvent(listener: UnifiedEventListener): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((item) => item !== listener)
    }
  }

  protected emit(event: UnifiedEvent): void {
    if (this.done && event.type !== 'error') {
      return
    }

    if (event.type === 'done') {
      this.done = true
    }

    this.listeners.forEach((listener) => listener(event))
  }

  protected resetDoneState(): void {
    this.done = false
  }
}
