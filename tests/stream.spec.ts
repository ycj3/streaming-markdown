import { strict as assert } from 'assert'
import { MarkdownStream } from '../src/main/ets/core/stream'
import { suite, test } from './test-harness'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitFor(predicate: () => boolean, timeoutMs: number = 1500, intervalMs: number = 5): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (predicate()) {
      return
    }
    await sleep(intervalMs)
  }
  throw new Error(`timeout after ${timeoutMs}ms`)
}

async function withMutedConsole<T>(fn: () => Promise<T> | T): Promise<T> {
  const original = console.log
  console.log = () => {}
  try {
    return await fn()
  } finally {
    console.log = original
  }
}

suite('stream:lifecycle', () => {
  test('append + finish renders all chars and completes', async () => {
    await withMutedConsole(async () => {
      const stream = new MarkdownStream({ mode: 'char', interval: 1 })
      stream.append('hello')
      stream.finish()
      await waitFor(() => stream.getState() === 'completed')

      assert.equal(stream.getState(), 'completed')
      assert.deepEqual(stream.getBlocks(), [{ id: 0, type: 'paragraph', text: 'hello' }])
    })
  })

  test('append empty chunk is no-op', async () => {
    await withMutedConsole(async () => {
      const stream = new MarkdownStream({ mode: 'char', interval: 1 })
      let diffCount = 0
      stream.subscribe(() => {
        diffCount += 1
      })

      stream.append('')
      await sleep(20)

      assert.equal(stream.getState(), 'idle')
      assert.equal(diffCount, 0)
      assert.deepEqual(stream.getBlocks(), [])
    })
  })

  test('pause stops progress until resume', async () => {
    await withMutedConsole(async () => {
      const stream = new MarkdownStream({ mode: 'char', interval: 15 })
      stream.append('abcdef')

      await sleep(20)
      stream.pause()

      assert.equal(stream.getState(), 'paused')
      const snapshot = JSON.stringify(stream.getBlocks())

      await sleep(60)
      assert.equal(JSON.stringify(stream.getBlocks()), snapshot)

      stream.resume()
      stream.finish()
      await waitFor(() => stream.getState() === 'completed')
      assert.deepEqual(stream.getBlocks(), [{ id: 0, type: 'paragraph', text: 'abcdef' }])
    })
  })

  test('resume continues a paused stream', async () => {
    await withMutedConsole(async () => {
      const stream = new MarkdownStream({ mode: 'char', interval: 5 })
      stream.append('resume')
      stream.pause()
      assert.equal(stream.getState(), 'paused')

      stream.resume()
      stream.finish()
      await waitFor(() => stream.getState() === 'completed')

      assert.equal(stream.getState(), 'completed')
      assert.deepEqual(stream.getBlocks(), [{ id: 0, type: 'paragraph', text: 'resume' }])
    })
  })

  test('finish on idle stream completes immediately', async () => {
    await withMutedConsole(async () => {
      const stream = new MarkdownStream({ mode: 'char', interval: 1 })
      let completeCount = 0
      stream.onComplete(() => {
        completeCount += 1
      })

      stream.finish()
      await sleep(20)

      assert.equal(stream.getState(), 'completed')
      assert.equal(completeCount, 1)
      assert.deepEqual(stream.getBlocks(), [])
    })
  })

  test('finish is idempotent after completion', async () => {
    await withMutedConsole(async () => {
      const stream = new MarkdownStream({ mode: 'char', interval: 1 })
      let completeCount = 0
      stream.onComplete(() => {
        completeCount += 1
      })

      stream.append('done')
      stream.finish()
      await waitFor(() => stream.getState() === 'completed')

      stream.finish()
      stream.finish()
      await sleep(20)

      assert.equal(completeCount, 1)
      assert.deepEqual(stream.getBlocks(), [{ id: 0, type: 'paragraph', text: 'done' }])
    })
  })

  test('reset clears state and notifies reset listeners', async () => {
    await withMutedConsole(async () => {
      const stream = new MarkdownStream({ mode: 'char', interval: 1 })
      let resetCount = 0
      stream.onReset(() => {
        resetCount += 1
      })

      stream.append('before reset')
      stream.finish()
      await waitFor(() => stream.getState() === 'completed')

      stream.reset()

      assert.equal(stream.getState(), 'idle')
      assert.equal(resetCount, 1)
      assert.deepEqual(stream.getBlocks(), [])
    })
  })

  test('append after completed auto-resets previous content', async () => {
    await withMutedConsole(async () => {
      const stream = new MarkdownStream({ mode: 'char', interval: 1 })
      let resetCount = 0
      stream.onReset(() => {
        resetCount += 1
      })

      stream.append('first')
      stream.finish()
      await waitFor(() => stream.getState() === 'completed')

      stream.append('second')
      stream.finish()
      await waitFor(() => stream.getState() === 'completed')

      assert.equal(resetCount, 1)
      assert.deepEqual(stream.getBlocks(), [{ id: 0, type: 'paragraph', text: 'second' }])
    })
  })

  test('word mode flushes buffered text on finish', async () => {
    await withMutedConsole(async () => {
      const stream = new MarkdownStream({ mode: 'word', interval: 2 })
      stream.append('buffer')
      stream.finish()
      await waitFor(() => stream.getState() === 'completed')

      assert.deepEqual(stream.getBlocks(), [{ id: 0, type: 'paragraph', text: 'buffer' }])
    })
  })
})
