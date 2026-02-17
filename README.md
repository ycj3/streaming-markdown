# @ycj3/streaming-markdown

HarmonyOS ArkTS 流式 Markdown 渲染器（V2 stream-only）。

> [English Version](./README_EN.md)

## 安装

```bash
ohpm install @ycj3/streaming-markdown
```

## 10 分钟快速开始（复制即用）

最短路径：直接复制 `examples/minimal-v2/QuickStartDemo.ets` 到你的页面。

1. 安装依赖。
2. 打开 `examples/minimal-v2/QuickStartDemo.ets`，整页复制到你的 ArkTS 页面。
3. 运行后点击：`本地模拟流` / `SSE(mock)` / `WebSocket(mock)`。
4. 看到渲染区持续更新，状态最终变为 `completed`。

说明：当前仓库此前没有可直接复制的 V2 最小示例，现新增目录 `examples/minimal-v2/`，不涉及旧示例迁移。

## 最小接入代码（核心只有 append/finish）

```typescript
import { MarkdownStream, StreamingMarkdown } from '@ycj3/streaming-markdown'

@Entry
@Component
struct MinimalPage {
  private stream: MarkdownStream = new MarkdownStream({ mode: 'word', interval: 20 })

  aboutToAppear() {
    this.stream.append('# Hello\n\n')
    this.stream.append('这是流式增量内容。\n')
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

## 三种输入示例

- 本地模拟流（直接 `append` + `finish`）
- SSE（mock，`[DONE]` 自动触发 `finish`）
- WebSocket（mock，`close` 自动触发 `finish`）

完整可运行页面见：`examples/minimal-v2/QuickStartDemo.ets`。

## V2 API（stream-only）

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

## Demo 与生产接入差异

- Demo 使用内存 mock 连接；生产改为真实网络连接或厂商 SDK。
- Demo 使用 `openaiLikeProfile`；生产按厂商协议扩展 `VendorProfile`。
- Demo 未覆盖鉴权、重试、超时、断线重连。
- Demo 是单路文本流；生产如有多通道（tool/reasoning）需先分流再喂给 `stream`。

## 相关文档

- 10 分钟指南：`docs/quickstart-10min.md`
- 厂商接入：`docs/vendor-integration.md`
- 架构说明：`docs/architecture.md`

## 环境要求

- HarmonyOS API 6.0.1+
- DevEco Studio 4.0+

## 许可证

Apache-2.0
