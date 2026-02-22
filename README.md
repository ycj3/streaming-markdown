# streaming-markdown

> [English Version](./README_EN.md)

## 1. Overview

`streaming-markdown` 是一个面向 HarmonyOS 的流式 Markdown 渲染库（`@ycj3/streaming-markdown`），用于在 AI/LLM 输出场景下边接收边渲染，减少整段重刷和布局跳动。

仓库是 monorepo 结构：
- 核心库：`packages/streaming-markdown`
- 业务示例：`apps/quickstart-harmony`

## 2. Features

支持的 Markdown 语法（当前实现）：

- 标题：`#` 到 `######`
- 段落：普通文本段落
- 引用：`> quote`
- 无序列表：`- item`
- 任务列表：`- [ ] todo` / `- [x] done`
- 有序列表：`1. item`
- 分割线：`---` / `***` / `___`
- 代码块：`\`\`\`lang ... \`\`\``
- 表格：`| h1 | h2 |`，支持对齐 `:---` / `:---:` / `---:`
- 行内粗体：`**bold**`
- 行内斜体：`*italic*`
- 行内粗斜体：`***bold italic***`
- 行内删除线：`~~del~~`
- 行内代码：`\`code\``
- 链接：`[text](url)`
- 行内数学公式：`$x^2$`
- 行间数学公式：`$$\frac{1}{2}$$`

流式能力：
- 通过 `MarkdownStream.append(chunk)` 持续推送增量内容
- 通过 `MarkdownStream.finish()` 标记流结束
- UI 使用 `StreamingMarkdown({ stream })` 自动增量更新

## 3. Installation

### 方式一：安装发布包（推荐）

```bash
ohpm install @ycj3/streaming-markdown
```

### 方式二：本地依赖（适合联调库源码）

在 `entry/oh-package.json5` 中添加：

```json5
{
  dependencies: {
    "@ycj3/streaming-markdown": "file:../../../packages/streaming-markdown",
  },
}
```

在 `build-profile.json5` 中添加模块声明：

```json5
{
  modules: [
    { name: "entry", srcPath: "./entry" },
    { name: "streaming_markdown", srcPath: "../../packages/streaming-markdown" },
  ],
}
```

## 4. Usage

### 页面中渲染流式 Markdown（最小接入）

```ts
import { MarkdownStream, StreamingMarkdown } from '@ycj3/streaming-markdown'

@Entry
@Component
struct MessagePage {
  private stream: MarkdownStream = new MarkdownStream({ mode: 'word', interval: 20 })

  aboutToAppear() {
    this.stream.append('# Hello\n\n')
    this.stream.append('这是流式返回的第一段内容。\n')
    this.stream.append('- item 1\n- item 2\n')
    this.stream.finish()
  }

  build() {
    Scroll() {
      StreamingMarkdown({
        stream: this.stream,
        onComplete: () => {
          console.info('stream completed')
        },
      })
    }
    .width('100%')
    .height('100%')
  }
}
```

### 对接 SSE / WebSocket 等流式接口

```ts
import { MarkdownStream } from '@ycj3/streaming-markdown'

const stream = new MarkdownStream({ mode: 'word', interval: 20 })

// 伪代码：把你的网络层 delta 持续喂给 stream
client.onDelta((text: string) => {
  stream.append(text)
})

client.onDone(() => {
  stream.finish()
})

client.onError((_err: Error) => {
  // 业务可选：出错时结束当前流，避免界面挂起
  stream.finish()
})
```

完整示例可参考：
- [`streaming-markdown 快速开始（本地流 / SSE mock / WebSocket mock）`](./packages/streaming-markdown/examples/minimal-v2/QuickStartDemo.ets)
- [`Gemini 3 快速开始（真实请求 + 流式渲染）`](./apps/quickstart-harmony/entry/src/main/ets/pages/Index.ets)
