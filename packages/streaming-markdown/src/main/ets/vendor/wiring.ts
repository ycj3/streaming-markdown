import { MarkdownStream } from '../core/stream'
import { VendorAdapter } from './types'

export interface AdapterStreamBindingOptions {
  onError?: (error: Error) => void
  finishOnError?: boolean
}

export function bindAdapterToStream(
  adapter: VendorAdapter,
  stream: MarkdownStream,
  options?: AdapterStreamBindingOptions
): () => void {
  const unsubscribe = adapter.onEvent((event) => {
    if (event.type === 'delta') {
      stream.append(event.text)
      return
    }

    if (event.type === 'done') {
      stream.finish()
      return
    }

    options?.onError?.(event.error)
    if (options?.finishOnError !== false) {
      stream.finish()
    }
  })

  return () => unsubscribe()
}
