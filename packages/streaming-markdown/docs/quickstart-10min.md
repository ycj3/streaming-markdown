# 10 分钟最小 Demo（V2 stream-only）

目标：最快看到 StreamingMarkdown 的流式渲染效果，并确认 `append` / `finish` 接入链路可用。

## 1. 操作步骤（复制即用）

1. 配置本地依赖（包尚未发布）：
   - `entry/oh-package.json5` 增加 `"@ycj3/streaming-markdown": "file:../../../packages/streaming-markdown"`
   - `build-profile.json5` 增加 `{ name: "streaming_markdown", srcPath: "../../packages/streaming-markdown" }`
2. 在你的页面中，直接复制 `examples/minimal-v2/QuickStartDemo.ets` 内容。
3. 运行后点击 3 个按钮：`本地模拟流` / `SSE(mock)` / `WebSocket(mock)`。
4. 观察同一块渲染区域：文本会持续追加，结束后状态变为 `completed`。

## 2. 你会看到什么

- 本地模拟流：显式调用 `stream.append(...)`，最后 `stream.finish()`。
- SSE(mock)：用分帧数据模拟事件输入，每帧调用 `append(...)`，末尾调用 `finish()`。
- WebSocket(mock)：用分帧消息模拟输入，每帧调用 `append(...)`，末尾调用 `finish()`。

## 3. Demo 与生产差异

- Demo 用数组模拟分帧输入；生产需替换为真实 SSE/WebSocket 或厂商 SDK 回调。
- Demo 重点是 `append`/`finish` 最短链路；生产建议接入 vendor adapter（见 `docs/vendor-integration.md`）。
- Demo 未加鉴权、重试、超时、断线重连；这些应在业务层补齐。
- Demo 只有单路文本流；生产若有 tool/reasoning 多通道，需要先做分流策略。
