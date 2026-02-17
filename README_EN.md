# @ycj3/streaming-markdown

A streaming Markdown renderer for HarmonyOS ArkTS (V2 stream-only).

> [中文版本](./README.md)

## Install

```bash
ohpm install @ycj3/streaming-markdown
```

## 10-Min Quick Start (Copy and Run)

Fastest path: copy `examples/minimal-v2/QuickStartDemo.ets` into your ArkTS page.

1. Install dependency.
2. Copy the whole file from `examples/minimal-v2/QuickStartDemo.ets`.
3. Run and click: `本地模拟流` / `SSE(mock)` / `WebSocket(mock)`.
4. You should see streaming updates and final `completed` status.

Note: the repo previously had no copy-ready V2 minimal demo. We added `examples/minimal-v2/` without migrating old examples.

## Minimal Integration (append/finish only)

```typescript
import { MarkdownStream, StreamingMarkdown } from '@ycj3/streaming-markdown'

@Entry
@Component
struct MinimalPage {
  private stream: MarkdownStream = new MarkdownStream({ mode: 'word', interval: 20 })

  aboutToAppear() {
    this.stream.append('# Hello\n\n')
    this.stream.append('This is incremental streamed content.\n')
    this.stream.finish()
  }

  build() {
    Scroll() {
      StreamingMarkdown({ stream: this.stream })
    }
    .width('100%')
    .height('100%')
  }
}
```

## Input Examples Included

- Local mock stream (`append` + `finish`)
- SSE (mock, `[DONE]` -> `finish`)
- WebSocket (mock, `close` -> `finish`)

Full runnable page: `examples/minimal-v2/QuickStartDemo.ets`.

## V2 API (stream-only)

### `MarkdownStream`

```ts
new MarkdownStream(options?)
stream.append(chunk: string)
stream.finish()
stream.pause()
stream.resume()
stream.reset()
stream.subscribe(listener)
stream.onComplete(listener)
```

### `StreamingMarkdown`

```ts
StreamingMarkdown({
  stream: MarkdownStream,
  onComplete?: () => void
})
```

## Demo vs Production

- Demo uses in-memory mock connections; production should use real network/SDK connections.
- Demo uses `openaiLikeProfile`; production should extend `VendorProfile` per vendor protocol.
- Demo does not include auth, retry, timeout, reconnect.
- Demo is single text stream; multi-channel streams (tool/reasoning) need routing before feeding `stream`.

## Docs

- 10-min guide: `docs/quickstart-10min.md`
- Vendor integration: `docs/vendor-integration.md`
- Architecture: `docs/architecture.md`

## Requirements

- HarmonyOS API 6.0.1+
- DevEco Studio 4.0+

## License

Apache-2.0
