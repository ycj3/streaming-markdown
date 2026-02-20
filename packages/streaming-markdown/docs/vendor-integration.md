# Vendor Adapter MVP 接入指南

本文档对应仓库内已实现的最小闭环代码，目标是让不同 LLM 厂商流统一接入 `MarkdownStream`。

## 1. 目录结构

```text
src/main/ets/vendor/
  index.ts
  types.ts
  adapter-base.ts
  adapter-utils.ts
  wiring.ts
  adapters/
    sse-adapter.ts
    websocket-adapter.ts
  profiles/
    openai-profile.ts
```

## 2. 统一事件模型

文件：`src/main/ets/vendor/types.ts`

```ts
type UnifiedEvent =
  | { type: 'delta'; text: string }
  | { type: 'done' }
  | { type: 'error'; error: Error }
```

统一接口：

```ts
interface VendorAdapter {
  start(request: unknown): Promise<void>
  onEvent(listener: (event: UnifiedEvent) => void): () => void
  stop(): void
}
```

## 3. Vendor Profile（字段映射）

文件：`src/main/ets/vendor/profiles/openai-profile.ts`

`openaiLikeProfile` 映射策略：

| 输入 | 规则 | 输出 |
|---|---|---|
| `choices[0].delta.content` | 字符串时作为增量文本 | `delta` |
| 字符串 `[DONE]` 或 `choices[0].finish_reason != null` | 视为完成 | `done` |
| `error.message` | 转成 `Error` | `error` |

示例原始事件：

```json
{"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}
```

映射后：

```json
{"type":"delta","text":"Hello"}
```

## 4. SSE Adapter 示例

文件：`src/main/ets/vendor/adapters/sse-adapter.ts`

`SSEAdapter` 接受两个输入：
- `VendorProfile`（字段映射）
- `SseConnectionFactory`（传输层工厂）

示例：

```ts
import { SSEAdapter, openaiLikeProfile } from '@ycj3/streaming-markdown'

const adapter = new SSEAdapter(openaiLikeProfile, async (_request) => {
  // 按你的 SDK/平台返回一个实现 SseConnection 的对象
  return sseConnection
})

await adapter.start({
  url: 'https://api.vendor.com/v1/chat/completions',
  headers: { Authorization: 'Bearer xxx' }
})
```

## 5. WebSocket Adapter 示例

文件：`src/main/ets/vendor/adapters/websocket-adapter.ts`

`WebSocketAdapter.start` 请求体约定：
- `connect`: 建立 WS 连接并返回 `WebSocketConnection`
- `initialPayload`: 可选，连接后自动 `send(JSON.stringify(initialPayload))`
- `finishOnClose`: 可选，默认 `true`

示例：

```ts
import { WebSocketAdapter, openaiLikeProfile } from '@ycj3/streaming-markdown'

const adapter = new WebSocketAdapter(openaiLikeProfile)

await adapter.start({
  connect: () => createWsConnection('wss://api.vendor.com/stream'),
  initialPayload: { model: 'gpt-4o-mini', input: 'hello' },
  finishOnClose: true
})
```

## 6. 最小接线（adapter -> MarkdownStream）

文件：`src/main/ets/vendor/wiring.ts`

```ts
import {
  MarkdownStream,
  SSEAdapter,
  openaiLikeProfile,
  bindAdapterToStream
} from '@ycj3/streaming-markdown'

const stream = new MarkdownStream({ mode: 'word', interval: 20 })
const adapter = new SSEAdapter(openaiLikeProfile, createSseConnection)

const unbind = bindAdapterToStream(adapter, stream, {
  onError: (err) => console.error(err),
  finishOnError: true
})

await adapter.start({ prompt: '写一段 Markdown' })

// 可选：页面卸载时
// unbind(); adapter.stop()
```

`bindAdapterToStream` 行为：
- `delta` -> `stream.append(text)`
- `done` -> `stream.finish()`
- `error` -> `onError(error)`，默认也会 `stream.finish()`

## 7. 可运行样例位置

测试文件：`tests/vendor.spec.ts`

覆盖内容：
- `openaiLikeProfile` 的 delta/done/error 映射
- `SSEAdapter` 驱动 `MarkdownStream`
- `WebSocketAdapter` 的 `initialPayload` 与 `close -> done`

## 8. 已知限制（MVP）

- 未内置重试/退避策略（由业务层控制）。
- 未处理多路 channel（tool/reasoning）分流。
- `WebSocketAdapter` 默认 `close` 视为 `done`，异常断开需由 `onError` 或业务侧判断。
- profile 目前只提供了 openai-like 示例，其他厂商建议按同接口扩展。
