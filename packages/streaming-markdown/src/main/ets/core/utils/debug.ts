const DEFAULT_STREAMING_MARKDOWN_DEBUG = false

function isRuntimeDebugEnabled(): boolean {
  const runtimeFlag = (globalThis as Record<string, unknown>).__STREAMING_MARKDOWN_DEBUG__
  return runtimeFlag === true
}

export function isDebugEnabled(): boolean {
  return DEFAULT_STREAMING_MARKDOWN_DEBUG || isRuntimeDebugEnabled()
}

export function debugLog(message: string | (() => string)): void {
  if (!isDebugEnabled()) {
    return
  }

  const resolved = typeof message === 'function' ? message() : message
  console.log(resolved)
}
